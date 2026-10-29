import requests

def test_api():
    base_url = 'http://127.0.0.1:5000/api'
    
    print("Testing Registration...")
    res = requests.post(f"{base_url}/auth/register", json={
        "name": "Test User",
        "email": "test@test.com",
        "password": "password123",
        "role": "student",
        "usn": "123",
        "department": "CSE",
        "semester": ""
    })
    print(f"Register Status: {res.status_code}")
    print(f"Register Response: {res.text}")
    
    print("\nTesting Login...")
    res = requests.post(f"{base_url}/auth/login", json={
        "email": "admin@college.edu",
        "password": "admin123"
    })
    print(f"Login Status: {res.status_code}")
    print(f"Login Response: {res.json()}")
    
    if res.status_code == 200:
        token = res.json().get('access_token')
        print(f"\nTesting Admin Stats with token...")
        stats_res = requests.get(f"{base_url}/admin/stats", headers={
            "Authorization": f"Bearer {token}"
        })
        print(f"Stats Status: {stats_res.status_code}")
        print(f"Stats Response: {stats_res.text}")

if __name__ == '__main__':
    test_api()
