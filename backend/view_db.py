from app import app
from models import db, User, Attendance, Settings, BlockchainRecord
import json

def view_database():
    with app.app_context():
        print("==================================================")
        print("              REGISTERED USERS & STUDENTS         ")
        print("==================================================")
        users = User.query.all()
        if not users:
            print("No users found.")
        for u in users:
            print(f"ID: {u.id} | Name: {u.name} | Email: {u.email} | Role: {u.role}")
            if u.role == 'student':
                print(f"  -> USN: {u.usn} | Dept: {u.department} | Sem: {u.semester}")
                print(f"  -> Face Encoding Stored: {'YES' if u.face_encoding else 'NO'}")
            print("-" * 50)
            
        print("\n==================================================")
        print("              ATTENDANCE RECORD LOGS              ")
        print("==================================================")
        records = Attendance.query.all()
        if not records:
            print("No attendance records found.")
        for r in records:
            print(f"ID: {r.id} | Student ID: {r.student_id} | Date: {r.date} | Time: {r.time}")
            print(f"  -> Location: ({r.latitude}, {r.longitude})")
            print(f"  -> Face Match: {r.face_status} | Inside Geofence: {r.geo_status}")
            print(f"  -> Final Status: {r.final_status}")
            print("-" * 50)

        print("\n==================================================")
        print("              GEOFENCE & ADMIN SETTINGS           ")
        print("==================================================")
        settings = Settings.query.all()
        for s in settings:
            print(f"Key: {s.key} ===> Value: {s.value}")
        print("-" * 50)

        print("\n==================================================")
        print("              BLOCKCHAIN RECORD HASHES            ")
        print("==================================================")
        blocks = BlockchainRecord.query.all()
        if not blocks:
            print("No blockchain records found.")
        for b in blocks:
            print(f"Block #{b.block_id} | Timestamp: {b.timestamp}")
            print(f"  -> Attendance ID reference: {b.attendance_id}")
            print(f"  -> Prev Hash: {b.previous_hash[:16]}...")
            print(f"  -> Curr Hash: {b.current_hash[:16]}...")
            print(f"  -> Data: {b.data}")
            print("-" * 50)

if __name__ == '__main__':
    view_database()
