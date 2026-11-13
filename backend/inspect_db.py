import sqlite3
import json
import os

db_path = os.path.join(os.path.dirname(__file__), 'attendance.db')
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("=" * 65)
print("             GEO-ATTEND DATABASE INSPECTOR              ")
print("          Database: backend/attendance.db              ")
print("=" * 65)

# 1. College Settings & Geofence
print("\n[1] COLLEGE SETTINGS & GEOFENCE PERIMETER:")
print("-" * 65)
cur.execute("SELECT key, value FROM settings")
settings = cur.fetchall()
for s in settings:
    print(f"  • {s['key']:<26} : {s['value']}")

# 2. Registered Users
print("\n[2] REGISTERED USERS & STUDENTS (users table):")
print("-" * 65)
cur.execute("SELECT id, name, email, role, usn, department, semester, face_encoding FROM users")
users = cur.fetchall()
print(f"{'ID':<4} | {'Role':<8} | {'Name':<18} | {'USN':<12} | {'Face Vector':<11} | Email")
print("-" * 65)
for u in users:
    has_face = "Stored (128-d)" if u['face_encoding'] else "No"
    usn = u['usn'] or '-'
    print(f"{u['id']:<4} | {u['role']:<8} | {u['name'][:18]:<18} | {usn:<12} | {has_face:<11} | {u['email']}")

# 3. Subjects Catalog
print("\n[3] SUBJECTS / COURSES (subjects table):")
print("-" * 65)
cur.execute("SELECT id, code, name, department, semester FROM subjects")
subjects = cur.fetchall()
if subjects:
    for sub in subjects:
        print(f"  • [{sub['code']}] {sub['name']} ({sub['department']}, Sem {sub['semester']})")
else:
    print("  (No subjects populated yet)")

# 4. Lecture Sessions
print("\n[4] LECTURE SESSIONS (lecture_sessions table):")
print("-" * 65)
cur.execute("SELECT id, title, room, is_active, created_at FROM lecture_sessions")
sessions = cur.fetchall()
if sessions:
    for sess in sessions:
        status = "🟢 ACTIVE" if sess['is_active'] else "⚪ ENDED"
        print(f"  • Session #{sess['id']} | {sess['title']} | {sess['room']} | {status} | {sess['created_at']}")
else:
    print("  (No lecture sessions conducted yet in central DB)")

# 5. Attendance Records
print("\n[5] ATTENDANCE LOG RECORDS (attendance table):")
print("-" * 65)
cur.execute("SELECT id, student_id, date, time, latitude, longitude, face_status, geo_status, final_status FROM attendance ORDER BY id DESC LIMIT 10")
records = cur.fetchall()
if records:
    for r in records:
        print(f"  • Punch #{r['id']} | Student ID: {r['student_id']} | Date: {r['date']} {r['time']}")
        print(f"    Location: ({r['latitude']}, {r['longitude']}) | Face Match: {r['face_status']} | Geofence: {r['geo_status']} | Status: {r['final_status']}")
else:
    print("  (No attendance records in central DB yet)")

# 6. Blockchain Blocks
print("\n[6] BLOCKCHAIN AUDIT LEDGER (blockchain table):")
print("-" * 65)
cur.execute("SELECT block_id, timestamp, previous_hash, current_hash, data FROM blockchain ORDER BY block_id ASC")
blocks = cur.fetchall()
if blocks:
    for b in blocks:
        print(f"  • Block #{b['block_id']} | Hash: {b['current_hash'][:16]}... | Prev: {b['previous_hash'][:16]}...")
else:
    print("  (No blockchain blocks yet)")

print("\n" + "=" * 65)
conn.close()

