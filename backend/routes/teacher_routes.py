from flask import Blueprint, request, jsonify, Response
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import db, User, Subject, LectureSession, Attendance, LeaveRequest
from datetime import datetime
import json
import csv
import io
import math

teacher_bp = Blueprint('teacher', __name__)

def get_current_user():
    user_str = get_jwt_identity()
    return json.loads(user_str)

@teacher_bp.route('/subjects', methods=['GET'])
@jwt_required()
def get_subjects():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    subjects = Subject.query.order_by(Subject.code.asc()).all()
    result = [{
        "id": s.id,
        "name": s.name,
        "code": s.code,
        "department": s.department,
        "semester": s.semester,
        "teacher_name": s.teacher.name if s.teacher else "Unassigned"
    } for s in subjects]
    return jsonify(result), 200

@teacher_bp.route('/sessions/active', methods=['GET'])
@jwt_required()
def get_active_session():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    # Find any active session for this teacher (or latest active session)
    session = LectureSession.query.filter_by(teacher_id=curr['id'], is_active=True).first()
    if not session:
        return jsonify({"active": False, "session": None}), 200
        
    attendances_count = Attendance.query.filter_by(session_id=session.id, final_status='PRESENT').count()
    total_marked = Attendance.query.filter_by(session_id=session.id).count()
    
    return jsonify({
        "active": True,
        "session": {
            "id": session.id,
            "subject_id": session.subject_id,
            "subject_name": session.subject.name if session.subject else "General",
            "subject_code": session.subject.code if session.subject else "GEN",
            "title": session.title or f"{session.subject.name} Lecture",
            "room": session.room or "Room 302",
            "created_at": session.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "is_active": session.is_active,
            "present_count": attendances_count,
            "total_marked": total_marked
        }
    }), 200

@teacher_bp.route('/sessions/start', methods=['POST'])
@jwt_required()
def start_session():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized. Only teachers can open sessions."}), 403
        
    data = request.json or {}
    subject_id = data.get('subject_id')
    title = data.get('title')
    room = data.get('room', 'Room 302')
    
    if not subject_id:
        return jsonify({"msg": "Please select a subject"}), 400
        
    subject = Subject.query.get(subject_id) if subject_id else None
    if not subject:
        subject_name = data.get('subject_name') or title or "Artificial Intelligence & ML"
        subject = Subject.query.filter(
            (Subject.name.ilike(f"%{subject_name}%")) | (Subject.code.ilike(f"%{subject_name}%"))
        ).first()
        if not subject:
            subject = Subject.query.first()
        if not subject:
            subject = Subject(
                name="Artificial Intelligence & ML",
                code="CS502",
                department="Computer Science",
                semester=5,
                teacher_id=curr['id']
            )
            db.session.add(subject)
            db.session.commit()
        
    # Close any currently open session for this teacher
    active_sessions = LectureSession.query.filter_by(teacher_id=curr['id'], is_active=True).all()
    for s in active_sessions:
        s.is_active = False
        s.ended_at = datetime.utcnow()
        
    # Create new session
    new_session = LectureSession(
        subject_id=subject.id,
        teacher_id=curr['id'],
        title=title or f"{subject.name} Lecture Session",
        room=room,
        is_active=True,
        created_at=datetime.utcnow()
    )
    db.session.add(new_session)
    db.session.commit()
    
    return jsonify({
        "msg": f"Live attendance session started for {subject.name} ({subject.code})",
        "session": {
            "id": new_session.id,
            "subject_id": new_session.subject_id,
            "subject_name": subject.name,
            "subject_code": subject.code,
            "title": new_session.title,
            "room": new_session.room,
            "created_at": new_session.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "is_active": True,
            "present_count": 0,
            "total_marked": 0
        }
    }), 201

@teacher_bp.route('/sessions/<int:session_id>/end', methods=['POST'])
@jwt_required()
def end_session(session_id):
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    session = LectureSession.query.get(session_id)
    if not session:
        return jsonify({"msg": "Session not found"}), 404
        
    session.is_active = False
    session.ended_at = datetime.utcnow()
    db.session.commit()
    
    present_count = Attendance.query.filter_by(session_id=session.id, final_status='PRESENT').count()
    
    return jsonify({
        "msg": f"Lecture session closed. Total present: {present_count}",
        "session_id": session.id,
        "is_active": False,
        "present_count": present_count
    }), 200

@teacher_bp.route('/sessions/<int:session_id>/rollcall', methods=['GET'])
@jwt_required()
def get_session_rollcall(session_id):
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    session = LectureSession.query.get(session_id)
    if not session:
        return jsonify({"msg": "Session not found"}), 404
        
    attendances = Attendance.query.filter_by(session_id=session.id).order_by(Attendance.id.desc()).all()
    
    records = []
    for a in attendances:
        records.append({
            "id": a.id,
            "student_id": a.student_id,
            "student_name": a.student.name if a.student else "Unknown",
            "usn": a.student.usn if a.student else "N/A",
            "department": a.student.department if a.student else "N/A",
            "time": str(a.time),
            "date": str(a.date),
            "status": a.final_status,
            "face_verified": a.face_status,
            "geo_verified": a.geo_status,
            "liveness_verified": getattr(a, 'liveness_status', False),
            "liveness_score": getattr(a, 'liveness_score', 0.0),
            "challenge_type": getattr(a, 'challenge_type', None),
            "latitude": a.latitude,
            "longitude": a.longitude
        })
        
    present_count = sum(1 for r in records if r['status'] == 'PRESENT')
    rejected_count = sum(1 for r in records if r['status'] == 'REJECTED')
    
    return jsonify({
        "session": {
            "id": session.id,
            "subject_name": session.subject.name if session.subject else "General",
            "subject_code": session.subject.code if session.subject else "GEN",
            "title": session.title,
            "room": session.room,
            "is_active": session.is_active,
            "created_at": session.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "ended_at": session.ended_at.strftime('%Y-%m-%d %H:%M:%S') if session.ended_at else None
        },
        "present_count": present_count,
        "rejected_count": rejected_count,
        "total": len(records),
        "rollcall": records
    }), 200

@teacher_bp.route('/sessions/history', methods=['GET'])
@jwt_required()
def get_sessions_history():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    sessions = LectureSession.query.filter_by(teacher_id=curr['id']).order_by(LectureSession.id.desc()).limit(20).all()
    
    result = []
    for s in sessions:
        present = Attendance.query.filter_by(session_id=s.id, final_status='PRESENT').count()
        total = Attendance.query.filter_by(session_id=s.id).count()
        result.append({
            "id": s.id,
            "subject_name": s.subject.name if s.subject else "Unknown",
            "subject_code": s.subject.code if s.subject else "N/A",
            "title": s.title,
            "room": s.room,
            "is_active": s.is_active,
            "created_at": s.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            "ended_at": s.ended_at.strftime('%Y-%m-%d %H:%M:%S') if s.ended_at else None,
            "present_count": present,
            "total_count": total
        })
        
    return jsonify(result), 200

@teacher_bp.route('/shortage-report', methods=['GET'])
@jwt_required()
def get_shortage_report():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    subject_id = request.args.get('subject_id', type=int)
    threshold = request.args.get('threshold', default=75.0, type=float)
    
    # Base query for students
    students = User.query.filter_by(role='student').order_by(User.name.asc()).all()
    
    # Get subjects taught or selected
    if subject_id:
        subjects = Subject.query.filter_by(id=subject_id).all()
    else:
        subjects = Subject.query.order_by(Subject.code.asc()).all()
        
    records = []
    total_defaulters = 0
    
    for student in students:
        for subj in subjects:
            # Total completed/conducted lecture sessions for this subject
            total_sessions = LectureSession.query.filter_by(subject_id=subj.id).count()
            if total_sessions == 0:
                continue
                
            # Attended lectures
            attended_count = Attendance.query.filter(
                Attendance.student_id == student.id,
                Attendance.subject_id == subj.id,
                Attendance.final_status.in_(['PRESENT', 'EXCUSED'])
            ).count()
            
            percentage = round((attended_count / total_sessions) * 100, 1)
            is_defaulter = percentage < threshold
            
            # Formula: Consecutive classes needed to reach threshold:
            # (attended + x) / (total + x) >= threshold / 100
            # x * (1 - t) >= t * total - attended
            # x = ceil((t * total - attended) / (1 - t))
            t = threshold / 100.0
            if is_defaulter:
                classes_needed = max(0, math.ceil((t * total_sessions - attended_count) / (1.0 - t)))
                total_defaulters += 1
            else:
                classes_needed = 0
                
            # How many classes can student safely miss while staying >= threshold?
            # (attended) / (total + m) >= t => total + m <= attended / t => m = floor(attended/t - total)
            safe_miss_allowed = max(0, math.floor(attended_count / t - total_sessions)) if attended_count > 0 else 0
            
            records.append({
                "student_id": student.id,
                "student_name": student.name,
                "usn": student.usn or "N/A",
                "department": student.department or "General",
                "semester": student.semester or 1,
                "subject_id": subj.id,
                "subject_name": subj.name,
                "subject_code": subj.code,
                "total_sessions": total_sessions,
                "attended_sessions": attended_count,
                "percentage": percentage,
                "is_defaulter": is_defaulter,
                "classes_needed": classes_needed,
                "safe_miss_allowed": safe_miss_allowed,
                "status": "CRITICAL" if percentage < 60 else ("WARNING" if is_defaulter else "ELIGIBLE")
            })
            
    return jsonify({
        "threshold": threshold,
        "total_records": len(records),
        "defaulters_count": total_defaulters,
        "students": records
    }), 200

@teacher_bp.route('/export-attendance', methods=['GET'])
@jwt_required()
def export_attendance():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    subject_id = request.args.get('subject_id', type=int)
    threshold = request.args.get('threshold', default=75.0, type=float)
    
    students = User.query.filter_by(role='student').order_by(User.usn.asc()).all()
    if subject_id:
        subjects = Subject.query.filter_by(id=subject_id).all()
        subj_name = subjects[0].code if subjects else "ALL"
    else:
        subjects = Subject.query.order_by(Subject.code.asc()).all()
        subj_name = "ALL_SUBJECTS"
        
    output = io.StringIO()
    writer = csv.writer(output)
    
    # Write Header
    writer.writerow([
        "USN",
        "Student Name",
        "Department",
        "Semester",
        "Subject Code",
        "Subject Name",
        "Total Classes Conducted",
        "Classes Attended",
        "Attendance %",
        "Eligibility Status (>= 75%)",
        "Consecutive Classes Needed to Reach 75%"
    ])
    
    for s in students:
        for subj in subjects:
            total_sessions = LectureSession.query.filter_by(subject_id=subj.id).count()
            if total_sessions == 0:
                continue
            attended = Attendance.query.filter(
                Attendance.student_id == s.id,
                Attendance.subject_id == subj.id,
                Attendance.final_status.in_(['PRESENT', 'EXCUSED'])
            ).count()
            
            pct = round((attended / total_sessions) * 100, 1)
            is_defaulter = pct < threshold
            t = threshold / 100.0
            classes_needed = max(0, math.ceil((t * total_sessions - attended) / (1.0 - t))) if is_defaulter else 0
            status_text = "DEFAULTER (SHORTAGE)" if is_defaulter else "ELIGIBLE"
            
            writer.writerow([
                s.usn or "N/A",
                s.name,
                s.department or "General",
                s.semester or "N/A",
                subj.code,
                subj.name,
                total_sessions,
                attended,
                f"{pct}%",
                status_text,
                classes_needed if is_defaulter else "None (Safe)"
            ])
            
    output.seek(0)
    filename = f"Attendance_Report_{subj_name}_{datetime.utcnow().strftime('%Y%m%d')}.csv"
    
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@teacher_bp.route('/leave-requests', methods=['GET'])
@jwt_required()
def get_leave_requests():
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    status_filter = request.args.get('status')
    query = LeaveRequest.query
    if status_filter:
        query = query.filter_by(status=status_filter.upper())
        
    requests = query.order_by(LeaveRequest.created_at.desc()).all()
    
    result = [{
        "id": req.id,
        "student_id": req.student_id,
        "student_name": req.student.name if req.student else "Unknown",
        "student_usn": req.student.usn if req.student else "N/A",
        "department": req.student.department if req.student else "N/A",
        "subject_name": req.subject.name if req.subject else "All Subjects / Full Day",
        "leave_type": req.leave_type,
        "start_date": req.start_date.strftime('%Y-%m-%d'),
        "end_date": req.end_date.strftime('%Y-%m-%d'),
        "reason": req.reason,
        "status": req.status,
        "reviewer_name": req.reviewer.name if req.reviewer else None,
        "reviewer_comment": req.reviewer_comment,
        "created_at": req.created_at.strftime('%Y-%m-%d %H:%M')
    } for req in requests]
    
    return jsonify(result), 200

@teacher_bp.route('/leave-requests/<int:req_id>/action', methods=['POST'])
@jwt_required()
def action_leave_request(req_id):
    curr = get_current_user()
    if curr.get('role') not in ['teacher', 'admin']:
        return jsonify({"msg": "Unauthorized"}), 403
        
    leave_req = LeaveRequest.query.get(req_id)
    if not leave_req:
        return jsonify({"msg": "Leave request not found"}), 404
        
    data = request.json or {}
    new_status = data.get('status', '').upper()
    if new_status not in ['APPROVED', 'REJECTED']:
        return jsonify({"msg": "Invalid status. Must be APPROVED or REJECTED"}), 400
        
    leave_req.status = new_status
    leave_req.reviewer_id = curr['id']
    leave_req.reviewer_comment = data.get('comment', 'Reviewed by faculty')
    leave_req.reviewed_at = datetime.utcnow()
    
    # If approved, automatically update or mark attendance for those dates as EXCUSED
    if new_status == 'APPROVED':
        # Find any attendances in the date range and mark them EXCUSED
        attendances = Attendance.query.filter(
            Attendance.student_id == leave_req.student_id,
            Attendance.date >= leave_req.start_date,
            Attendance.date <= leave_req.end_date
        ).all()
        for att in attendances:
            if leave_req.subject_id is None or att.subject_id == leave_req.subject_id:
                att.final_status = 'EXCUSED'
                
    db.session.commit()
    
    return jsonify({
        "msg": f"Leave request {new_status.lower()} successfully",
        "status": leave_req.status
    }), 200

