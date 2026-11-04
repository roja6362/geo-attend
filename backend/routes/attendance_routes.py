from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Attendance, Subject, LectureSession, LeaveRequest
from face_module import get_face_encoding, verify_face
from geo_module import verify_location
from blockchain import blockchain
from liveness_module import verify_liveness
from datetime import datetime
import json
import random
import math

attendance_bp = Blueprint('attendance', __name__)

@attendance_bp.route('/challenge', methods=['GET'])
@jwt_required()
def get_dynamic_challenge():
    instant_mode = {
        "id": "c_instant",
        "type": "instant",
        "prompt": "Align your face with the camera 📸",
        "instruction": "Hold steady and click Punch Attendance.",
        "duration_sec": 0
    }
    return jsonify(instant_mode), 200

@attendance_bp.route('/active-sessions', methods=['GET'])
@jwt_required()
def get_active_sessions():
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    
    # Active lecture sessions opened by teachers
    active_sessions = LectureSession.query.filter_by(is_active=True).order_by(LectureSession.id.desc()).all()
    
    result = []
    for s in active_sessions:
        already_marked = Attendance.query.filter_by(
            session_id=s.id,
            student_id=current_user['id'],
            final_status='PRESENT'
        ).first() is not None
        
        result.append({
            "id": s.id,
            "subject_id": s.subject_id,
            "subject_name": s.subject.name if s.subject else "General Lecture",
            "subject_code": s.subject.code if s.subject else "GEN",
            "teacher_name": s.teacher.name if s.teacher else "Faculty",
            "department": s.subject.department if s.subject else "Computer Science",
            "semester": s.subject.semester if s.subject else 5,
            "title": s.title or f"{s.subject.name} Lecture",
            "room": s.room or "Room 302",
            "created_at": s.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "already_marked": already_marked
        })
    return jsonify(result), 200

@attendance_bp.route('/register-face', methods=['POST'])
@jwt_required()
def register_face():
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    if current_user['role'] != 'student':
        return jsonify({"msg": "Only students can register face"}), 403
        
    data = request.json
    base64_image = data.get('image')
    
    if not base64_image:
        return jsonify({"msg": "No image provided"}), 400
        
    user = User.query.get(current_user['id'])
    
    embedding, msg = get_face_encoding(base64_image, user.id)
    
    if not embedding:
        return jsonify({"msg": msg}), 400
        
    # Store embedding as JSON string
    user.face_encoding = json.dumps(embedding)
    db.session.commit()
    
    return jsonify({"msg": "Face registered successfully"}), 200

@attendance_bp.route('/mark', methods=['POST'])
@jwt_required()
def mark_attendance():
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    if current_user['role'] != 'student':
        return jsonify({"msg": "Only students can mark attendance"}), 403
        
    data = request.json
    base64_image = data.get('image')
    prev_image = data.get('prev_image')
    challenge_type = data.get('challenge_type', 'auto')
    session_id = data.get('session_id')
    lat = data.get('latitude')
    lon = data.get('longitude')
    
    if not base64_image or lat is None or lon is None:
        return jsonify({"msg": "Image and location are required"}), 400
        
    user = User.query.get(current_user['id'])
    if not user.face_encoding:
        return jsonify({"msg": "Please register your face first"}), 400
        
    registered_embedding = json.loads(user.face_encoding)
    
    # Check lecture session if provided
    active_session = None
    subject_id = None
    subject_name = "General Attendance"
    subject_code = "GEN"
    room_name = "Classroom"
    
    if session_id:
        active_session = LectureSession.query.get(session_id)
        if not active_session or not active_session.is_active:
            return jsonify({"msg": "This lecture session has ended or is inactive."}), 400
            
        existing = Attendance.query.filter_by(
            session_id=active_session.id, 
            student_id=user.id, 
            final_status='PRESENT'
        ).first()
        if existing:
            return jsonify({"msg": f"Attendance already recorded for {active_session.subject.name}!"}), 400
            
        subject_id = active_session.subject_id
        if active_session.subject:
            subject_name = active_session.subject.name
            subject_code = active_session.subject.code
        room_name = active_session.room or "Room 302"
    else:
        # Check if any active lecture exists that requires selection
        open_session = LectureSession.query.filter_by(is_active=True).first()
        if open_session:
            active_session = open_session
            session_id = open_session.id
            subject_id = open_session.subject_id
            if open_session.subject:
                subject_name = open_session.subject.name
                subject_code = open_session.subject.code
            room_name = open_session.room or "Room 302"
    
    # 1. Verify Location first (instant computation)
    is_inside_geo, distance, center_lat, center_lon = verify_location(lat, lon)
    
    liveness_result = {
        "liveness_passed": False,
        "liveness_score": 0.0,
        "anti_spoof_passed": False,
        "challenge_passed": False,
        "challenge_type": challenge_type,
        "motion_score": 0.0,
        "spoof_detected": False,
        "message": "Geofence check failed"
    }
    
    if not is_inside_geo:
        # Skip face matching entirely if outside the geofence area
        is_face_match = False
        confidence = 0.0
        face_msg = f"Outside classroom perimeter ({int(distance)}m away)"
        final_status = 'REJECTED'
    else:
        # 2. AI Dynamic Liveness & Anti-Spoofing Verification
        liveness_result = verify_liveness(
            curr_base64=base64_image,
            prev_base64=prev_image,
            challenge_type=challenge_type
        )
        
        if not liveness_result.get("liveness_passed"):
            is_face_match = False
            confidence = 0.0
            face_msg = liveness_result.get("message", "Liveness verification failed")
            final_status = 'REJECTED'
        else:
            # 3. Verify Biometric Face only if liveness and geofence passed
            is_face_match, confidence, face_msg = verify_face(base64_image, registered_embedding)
            final_status = 'PRESENT' if is_face_match else 'REJECTED'
    
    # 4. Save to Database
    attendance = Attendance(
        student_id=user.id,
        session_id=session_id,
        subject_id=subject_id,
        latitude=lat,
        longitude=lon,
        face_status=is_face_match,
        geo_status=is_inside_geo,
        liveness_status=liveness_result.get('liveness_passed', False),
        liveness_score=liveness_result.get('liveness_score', 0.0),
        challenge_type=challenge_type,
        final_status=final_status
    )
    db.session.add(attendance)
    db.session.commit() # Commit to get attendance.id
    
    # 5. Add to Blockchain if PRESENT
    block_id = None
    if final_status == 'PRESENT':
        block_data = {
            'student_id': user.id,
            'student_name': user.name,
            'usn': user.usn,
            'subject_name': subject_name,
            'subject_code': subject_code,
            'session_id': session_id,
            'room': room_name,
            'date': str(attendance.date),
            'time': str(attendance.time),
            'lat': lat,
            'lon': lon,
            'status': 'PRESENT',
            'face_confidence': round(confidence, 1),
            'distance_meters': round(distance, 1),
            'liveness_verified': True,
            'liveness_score': liveness_result.get('liveness_score', 95.0),
            'anti_spoofing': 'VERIFIED_ORGANIC_SKIN',
            'challenge_type': challenge_type,
            'motion_score': liveness_result.get('motion_score', 0.0)
        }
        
        last_block = blockchain.get_last_block()
        prev_hash = last_block.current_hash if last_block else "0" * 64
        
        new_block = blockchain.create_block(
            attendance_id=attendance.id,
            data=block_data,
            previous_hash=prev_hash
        )
        block_id = new_block.block_id

    return jsonify({
        "msg": "Attendance processed",
        "final_status": final_status,
        "face_match": is_face_match,
        "face_confidence": confidence,
        "face_msg": face_msg,
        "inside_geofence": is_inside_geo,
        "distance": distance,
        "subject_name": subject_name,
        "subject_code": subject_code,
        "session_id": session_id,
        "liveness_passed": liveness_result.get('liveness_passed', False),
        "liveness_score": liveness_result.get('liveness_score', 0.0),
        "anti_spoof_passed": liveness_result.get('anti_spoof_passed', False),
        "challenge_passed": liveness_result.get('challenge_passed', False),
        "challenge_type": challenge_type,
        "motion_score": liveness_result.get('motion_score', 0.0),
        "spoof_detected": liveness_result.get('spoof_detected', False),
        "liveness_msg": liveness_result.get('message', ''),
        "block_id": block_id
    }), 200

@attendance_bp.route('/history', methods=['GET'])
@jwt_required()
def get_history():
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    
    if current_user['role'] == 'student':
        attendances = Attendance.query.filter_by(student_id=current_user['id']).order_by(Attendance.id.desc()).all()
    else:
        # Teachers and Admins can see all
        attendances = Attendance.query.order_by(Attendance.id.desc()).all()
        
    result = []
    for a in attendances:
        sub_name = a.subject.name if a.subject else (a.session.subject.name if (a.session and a.session.subject) else "General Attendance")
        sub_code = a.subject.code if a.subject else (a.session.subject.code if (a.session and a.session.subject) else "GEN")
        session_title = a.session.title if a.session else None
        room = a.session.room if a.session else None
        
        result.append({
            "id": a.id,
            "student_id": a.student_id,
            "student_name": a.student.name if a.student else "Unknown",
            "usn": a.student.usn if a.student else "N/A",
            "department": a.student.department if a.student else "N/A",
            "semester": a.student.semester if a.student else None,
            "subject_name": sub_name,
            "subject_code": sub_code,
            "session_title": session_title,
            "room": room,
            "session_id": a.session_id,
            "date": str(a.date),
            "time": str(a.time),
            "status": a.final_status,
            "face_verified": a.face_status,
            "geo_verified": a.geo_status,
            "liveness_verified": getattr(a, 'liveness_status', False),
            "liveness_score": getattr(a, 'liveness_score', 0.0),
            "challenge_type": getattr(a, 'challenge_type', None),
            "latitude": a.latitude,
            "longitude": a.longitude
        })
    return jsonify(result), 200

@attendance_bp.route('/<int:att_id>/toggle-status', methods=['POST'])
@jwt_required()
def toggle_status(att_id):
    current_user_str = get_jwt_identity()
    current_user = json.loads(current_user_str)
    if current_user['role'] not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized. Only teachers or admins can update status."}), 403
    
    attendance = Attendance.query.get(att_id)
    if not attendance:
        return jsonify({"msg": "Record not found"}), 404
        
    data = request.json or {}
    new_status = data.get('status')
    if not new_status:
        new_status = 'PRESENT' if attendance.final_status == 'REJECTED' else 'REJECTED'
    else:
        new_status = new_status.upper()
        
    attendance.final_status = new_status
    db.session.commit()
    return jsonify({"msg": f"Attendance status updated to {new_status}", "final_status": new_status}), 200

@attendance_bp.route('/geofence-settings', methods=['GET'])
@jwt_required()
def get_geofence_settings():
    from models import Settings
    name = Settings.query.filter_by(key='GEOFENCE_NAME').first()
    lat = Settings.query.filter_by(key='DEFAULT_LATITUDE').first()
    lon = Settings.query.filter_by(key='DEFAULT_LONGITUDE').first()
    rad = Settings.query.filter_by(key='DEFAULT_RADIUS_METERS').first()
    return jsonify({
        "name": name.value if name else "Target Classroom / Building",
        "latitude": float(lat.value) if lat else 15.1684,
        "longitude": float(lon.value) if lon else 76.8505,
        "radius": int(rad.value) if rad else 500
    }), 200

@attendance_bp.route('/leave-request', methods=['POST'])
@jwt_required()
def submit_leave_request():
    curr_str = get_jwt_identity()
    curr = json.loads(curr_str)
    
    data = request.json or {}
    leave_type = data.get('leave_type', 'MEDICAL').upper()
    start_str = data.get('start_date')
    end_str = data.get('end_date')
    reason = data.get('reason', '').strip()
    subject_id = data.get('subject_id') # Optional, null means full day
    
    if not start_str or not end_str or not reason:
        return jsonify({"msg": "Please provide start_date, end_date, and reason"}), 400
        
    try:
        start_date = datetime.strptime(start_str, '%Y-%m-%d').date()
        end_date = datetime.strptime(end_str, '%Y-%m-%d').date()
    except ValueError:
        return jsonify({"msg": "Invalid date format. Use YYYY-MM-DD"}), 400
        
    if end_date < start_date:
        return jsonify({"msg": "End date cannot be earlier than start date"}), 400
        
    leave_req = LeaveRequest(
        student_id=curr['id'],
        subject_id=subject_id if subject_id else None,
        leave_type=leave_type,
        start_date=start_date,
        end_date=end_date,
        reason=reason,
        status='PENDING'
    )
    db.session.add(leave_req)
    db.session.commit()
    
    return jsonify({
        "msg": "Leave request submitted successfully. Awaiting faculty approval.",
        "id": leave_req.id
    }), 201

@attendance_bp.route('/my-leave-requests', methods=['GET'])
@jwt_required()
def get_my_leave_requests():
    curr_str = get_jwt_identity()
    curr = json.loads(curr_str)
    
    requests = LeaveRequest.query.filter_by(student_id=curr['id']).order_by(LeaveRequest.created_at.desc()).all()
    
    result = [{
        "id": req.id,
        "leave_type": req.leave_type,
        "subject_name": req.subject.name if req.subject else "All Subjects / Full Day",
        "start_date": req.start_date.strftime('%Y-%m-%d'),
        "end_date": req.end_date.strftime('%Y-%m-%d'),
        "reason": req.reason,
        "status": req.status,
        "reviewer_name": req.reviewer.name if req.reviewer else None,
        "reviewer_comment": req.reviewer_comment,
        "created_at": req.created_at.strftime('%Y-%m-%d %H:%M')
    } for req in requests]
    
    return jsonify(result), 200

@attendance_bp.route('/my-eligibility', methods=['GET'])
@jwt_required()
def get_my_eligibility():
    curr_str = get_jwt_identity()
    curr = json.loads(curr_str)
    threshold = 75.0
    t = threshold / 100.0
    
    subjects = Subject.query.order_by(Subject.code.asc()).all()
    breakdown = []
    
    overall_total = 0
    overall_attended = 0
    
    for subj in subjects:
        total_sessions = LectureSession.query.filter_by(subject_id=subj.id).count()
        if total_sessions == 0:
            continue
            
        attended = Attendance.query.filter(
            Attendance.student_id == curr['id'],
            Attendance.subject_id == subj.id,
            Attendance.final_status.in_(['PRESENT', 'EXCUSED'])
        ).count()
        
        overall_total += total_sessions
        overall_attended += attended
        
        pct = round((attended / total_sessions) * 100, 1)
        is_defaulter = pct < threshold
        classes_needed = max(0, math.ceil((t * total_sessions - attended) / (1.0 - t))) if is_defaulter else 0
        safe_miss = max(0, math.floor(attended / t - total_sessions)) if attended > 0 else 0
        
        breakdown.append({
            "subject_id": subj.id,
            "subject_name": subj.name,
            "subject_code": subj.code,
            "total_classes": total_sessions,
            "attended_classes": attended,
            "percentage": pct,
            "is_defaulter": is_defaulter,
            "classes_needed": classes_needed,
            "safe_miss_allowed": safe_miss,
            "status": "CRITICAL" if pct < 60 else ("WARNING" if is_defaulter else "SAFE")
        })
        
    overall_pct = round((overall_attended / overall_total) * 100, 1) if overall_total > 0 else 100.0
    overall_defaulter = overall_pct < threshold
    overall_classes_needed = max(0, math.ceil((t * overall_total - overall_attended) / (1.0 - t))) if overall_defaulter else 0
    
    return jsonify({
        "overall_percentage": overall_pct,
        "overall_total": overall_total,
        "overall_attended": overall_attended,
        "is_overall_defaulter": overall_defaulter,
        "overall_classes_needed": overall_classes_needed,
        "subjects": breakdown
    }), 200

