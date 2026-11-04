from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Settings, Attendance

admin_bp = Blueprint('admin', __name__)

import json

def is_admin():
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    return current_user.get('role') == 'admin'

@admin_bp.route('/stats', methods=['GET'])
@jwt_required()
def get_stats():
    if not is_admin():
        return jsonify({"msg": "Unauthorized"}), 403
        
    total_students = User.query.filter_by(role='student').count()
    total_teachers = User.query.filter_by(role='teacher').count()
    
    # In a real app, query by today's date. For now, all attendance.
    total_attendance = Attendance.query.count()
    present_count = Attendance.query.filter_by(final_status='PRESENT').count()
    absent_count = Attendance.query.filter_by(final_status='REJECTED').count()
    
    pct = (present_count / total_attendance * 100) if total_attendance > 0 else 0
    
    return jsonify({
        "total_students": total_students,
        "total_teachers": total_teachers,
        "total_attendance": total_attendance,
        "present": present_count,
        "absent": absent_count,
        "percentage": round(pct, 2),
        "average_attendance_rate": round(pct, 2)
    }), 200

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
def get_users():
    if not is_admin():
        return jsonify({"msg": "Unauthorized"}), 403
        
    users = User.query.all()
    return jsonify([{
        "id": u.id,
        "name": u.name,
        "email": u.email,
        "role": u.role,
        "department": u.department,
        "usn": u.usn or "N/A",
        "semester": u.semester,
        "phone_number": u.phone_number,
        "face_registered": bool(u.face_encoding)
    } for u in users]), 200

@admin_bp.route('/settings', methods=['GET', 'POST'])
@jwt_required()
def manage_settings():
    if not is_admin():
        return jsonify({"msg": "Unauthorized"}), 403
        
    if request.method == 'GET':
        settings = Settings.query.all()
        return jsonify({s.key: s.value for s in settings}), 200
        
    if request.method == 'POST':
        data = request.json
        for key, value in data.items():
            setting = Settings.query.filter_by(key=key).first()
            if setting:
                setting.value = str(value)
            else:
                db.session.add(Settings(key=key, value=str(value)))
        db.session.commit()
        return jsonify({"msg": "Settings updated"}), 200

@admin_bp.route('/register-student-face', methods=['POST'])
@jwt_required()
def register_student_face():
    if not is_admin():
        return jsonify({"msg": "Unauthorized"}), 403
        
    data = request.json
    student_id = data.get('student_id')
    base64_image = data.get('image')
    
    if not student_id or not base64_image:
        return jsonify({"msg": "Student ID and image are required"}), 400
        
    student = User.query.get(student_id)
    if not student:
        return jsonify({"msg": "Student not found"}), 404
        
    if student.role != 'student':
        return jsonify({"msg": "Selected user is not a student"}), 400
        
    from face_module import get_face_encoding
    embedding, msg = get_face_encoding(base64_image, student.id)
    
    if not embedding:
        return jsonify({"msg": msg}), 400
        
    student.face_encoding = json.dumps(embedding)
    db.session.commit()
    
    return jsonify({"msg": "Student face registered successfully"}), 200

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def delete_user(user_id):
    if not is_admin():
        return jsonify({"msg": "Unauthorized"}), 403
        
    user = User.query.get(user_id)
    if not user:
        return jsonify({"msg": "User not found"}), 404
        
    if user.role != 'student':
        return jsonify({"msg": "Only student accounts can be deleted"}), 400
        
    # Delete related attendance records
    Attendance.query.filter_by(student_id=user_id).delete()
    
    # Delete the student user
    db.session.delete(user)
    db.session.commit()
    
    return jsonify({"msg": f"Student {user.name} and their attendance history deleted successfully"}), 200
