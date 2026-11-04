import requests
import time
import subprocess
import sys
import os

print("=== Starting Full Project Verification Suite ===")

python_exe = os.path.abspath(r"backend\venv\Scripts\python.exe")
backend_dir = os.path.abspath("backend")

proc = subprocess.Popen(
    [python_exe, "app.py"],
    cwd=backend_dir,
    stdout=subprocess.PIPE,
    stderr=subprocess.PIPE,
    text=True
)

base = "http://127.0.0.1:5000/api"

# Wait for server to become responsive
ready = False
for attempt in range(15):
    time.sleep(1)
    if proc.poll() is not None:
        out, err = proc.communicate()
        print("Backend exited early!")
        print("STDOUT:", out)
        print("STDERR:", err)
        sys.exit(1)
    try:
        r = requests.get(f"{base}/health", timeout=1)
        if r.status_code == 200:
            ready = True
            break
    except Exception:
        pass

if not ready:
    out, err = proc.communicate(timeout=2)
    print("Backend failed to start in 15 seconds")
    print("STDOUT:", out)
    print("STDERR:", err)
    sys.exit(1)

try:
    # 1. Health
    h = requests.get(f"{base}/health", timeout=3)
    print(f"[1/6] Health Check: {h.status_code} - {h.json()}")
    assert h.status_code == 200

    # 2. Admin Login & Stats & Users
    admin_login = requests.post(f"{base}/auth/login", json={
        "email": "admin@college.edu",
        "password": "admin123"
    })
    print(f"[2/6] Admin Login: {admin_login.status_code}")
    assert admin_login.status_code == 200
    admin_token = admin_login.json()["access_token"]

    stats = requests.get(f"{base}/admin/stats", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"      Admin Stats: {stats.json()}")
    assert stats.status_code == 200
    assert stats.json()["total_students"] > 0

    users = requests.get(f"{base}/admin/users", headers={"Authorization": f"Bearer {admin_token}"})
    user_list = users.json()
    print(f"      Admin Users Count: {len(user_list)}")
    roja = next((u for u in user_list if "thimmareddy" in u.get("email", "")), None)
    print(f"      Found Roja in DB: {roja}")
    assert roja is not None
    assert roja["face_registered"] is True

    # 3. Teacher Login & Subjects & Start Session
    t_login = requests.post(f"{base}/auth/login", json={
        "email": "teacher@college.edu",
        "password": "teacher123"
    })
    print(f"[3/6] Teacher Login: {t_login.status_code}")
    assert t_login.status_code == 200
    t_token = t_login.json()["access_token"]

    subs = requests.get(f"{base}/teacher/subjects", headers={"Authorization": f"Bearer {t_token}"})
    print(f"      Teacher Subjects: {[s['code'] + ' - ' + s['name'] for s in subs.json()]}")
    assert len(subs.json()) > 0
    sub_id = subs.json()[0]["id"]

    start_sess = requests.post(f"{base}/teacher/sessions/start", json={
        "subject_id": sub_id,
        "title": "Unit 3: AI Deep Learning & Neural Networks",
        "room": "Room 302"
    }, headers={"Authorization": f"Bearer {t_token}"})
    print(f"      Teacher Start Session: {start_sess.status_code} - {start_sess.json().get('msg')}")
    assert start_sess.status_code in [200, 201]
    active_session_id = start_sess.json()["session"]["id"]

    # 4. Student Login & View Active Session
    s_login = requests.post(f"{base}/auth/login", json={
        "email": "thimmareddym4@gmail.com",
        "password": "MRoja@2004"
    })
    print(f"[4/6] Student Roja Login: {s_login.status_code} - User: {s_login.json()['user']['name']}")
    assert s_login.status_code == 200
    s_token = s_login.json()["access_token"]

    act_sess = requests.get(f"{base}/attendance/active-sessions", headers={"Authorization": f"Bearer {s_token}"})
    print(f"      Active Sessions for Student: {len(act_sess.json())} sessions")
    assert len(act_sess.json()) > 0
    assert act_sess.json()[0]["id"] == active_session_id

    # 5. Teacher Live Rollcall Check
    rollcall = requests.get(f"{base}/teacher/sessions/{active_session_id}/rollcall", headers={"Authorization": f"Bearer {t_token}"})
    print(f"[5/6] Teacher Live Rollcall Stream: {rollcall.status_code} - Present: {rollcall.json().get('present_count')}")
    assert rollcall.status_code == 200

    # 6. Blockchain Verification
    bc = requests.get(f"{base}/blockchain/verify")
    print(f"[6/6] Blockchain Cryptographic Integrity: {bc.status_code} - Valid: {bc.json().get('is_valid')}")
    assert bc.status_code == 200
    assert bc.json()["is_valid"] is True

    print("\n=======================================================")
    print("SUCCESS: ALL 6 SUBSYSTEMS PASSED WITH 100% SUCCESS!")
    print("   1. Health check & Server runtime: OK")
    print("   2. Admin Portal & Real Student Records: OK")
    print("   3. Teacher Portal & Subject Selection: OK")
    print("   4. Session Activation & Cross-Device Sync: OK")
    print("   5. Real-Time Rollcall Engine: OK")
    print("   6. Cryptographic Blockchain Ledger: OK")
    print("=======================================================")

finally:
    proc.terminate()
    try:
        proc.wait(timeout=3)
    except:
        proc.kill()
