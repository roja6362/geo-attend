from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import json

db = SQLAlchemy()

class User(db.Model):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    role = db.Column(db.String(20), nullable=False) # 'admin', 'teacher', 'student'
    name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(200), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.now)
    
    # Student specific fields
    usn = db.Column(db.String(50), unique=True, nullable=True)
    department = db.Column(db.String(100), nullable=True)
    semester = db.Column(db.Integer, nullable=True)
    phone_number = db.Column(db.String(20), nullable=True)
    face_encoding = db.Column(db.Text, nullable=True) # JSON string of the embedding

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class ClassGroup(db.Model):
    __tablename__ = 'class_groups'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    department = db.Column(db.String(100), nullable=False)
    semester = db.Column(db.Integer, nullable=False)

class Subject(db.Model):
    __tablename__ = 'subjects'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # e.g. 'Database Management Systems'
    code = db.Column(db.String(20), unique=True, nullable=False) # e.g. 'CS501'
    department = db.Column(db.String(100), nullable=False, default='Computer Science')
    semester = db.Column(db.Integer, nullable=False, default=5)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    
    teacher = db.relationship('User', backref=db.backref('subjects', lazy=True))

class LectureSession(db.Model):
    __tablename__ = 'lecture_sessions'
    id = db.Column(db.Integer, primary_key=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=False)
    teacher_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    title = db.Column(db.String(150), nullable=True) # e.g. 'Lecture 14: Relational Algebra & SQL'
    room = db.Column(db.String(50), default='Room 302')
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    ended_at = db.Column(db.DateTime, nullable=True)
    
    subject = db.relationship('Subject', backref=db.backref('sessions', lazy=True))
    teacher = db.relationship('User', backref=db.backref('conducted_sessions', lazy=True))

class Attendance(db.Model):
    __tablename__ = 'attendance'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    session_id = db.Column(db.Integer, db.ForeignKey('lecture_sessions.id'), nullable=True)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True)
    date = db.Column(db.Date, nullable=False, default=lambda: datetime.now().date())
    time = db.Column(db.Time, nullable=False, default=lambda: datetime.now().time())
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    face_status = db.Column(db.Boolean, default=False)
    geo_status = db.Column(db.Boolean, default=False)
    liveness_status = db.Column(db.Boolean, default=False)
    liveness_score = db.Column(db.Float, default=0.0)
    challenge_type = db.Column(db.String(50), nullable=True)
    final_status = db.Column(db.String(20), default='REJECTED') # 'PRESENT', 'REJECTED'
    
    student = db.relationship('User', backref=db.backref('attendances', lazy=True))
    session = db.relationship('LectureSession', backref=db.backref('attendances', lazy=True))
    subject = db.relationship('Subject', backref=db.backref('attendances', lazy=True))

class BlockchainRecord(db.Model):
    __tablename__ = 'blockchain'
    block_id = db.Column(db.Integer, primary_key=True)
    timestamp = db.Column(db.Float, nullable=False)
    attendance_id = db.Column(db.Integer, nullable=True) # Genesis block might not have an attendance_id
    previous_hash = db.Column(db.String(64), nullable=False)
    current_hash = db.Column(db.String(64), nullable=False)
    nonce = db.Column(db.Integer, nullable=False)
    data = db.Column(db.Text, nullable=False) # JSON representation of block data

class Settings(db.Model):
    __tablename__ = 'settings'
    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(50), unique=True, nullable=False)
    value = db.Column(db.String(200), nullable=False)

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

class LeaveRequest(db.Model):
    __tablename__ = 'leave_requests'
    id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    subject_id = db.Column(db.Integer, db.ForeignKey('subjects.id'), nullable=True) # None = All subjects for the day
    leave_type = db.Column(db.String(50), nullable=False, default='MEDICAL') # 'MEDICAL', 'ON_DUTY', 'SPORTS', 'PERSONAL'
    start_date = db.Column(db.Date, nullable=False)
    end_date = db.Column(db.Date, nullable=False)
    reason = db.Column(db.Text, nullable=False)
    status = db.Column(db.String(20), default='PENDING') # 'PENDING', 'APPROVED', 'REJECTED'
    reviewer_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    reviewer_comment = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.now)
    reviewed_at = db.Column(db.DateTime, nullable=True)

    student = db.relationship('User', foreign_keys=[student_id], backref=db.backref('leave_requests', lazy=True))
    reviewer = db.relationship('User', foreign_keys=[reviewer_id])
    subject = db.relationship('Subject', foreign_keys=[subject_id])

    def __init__(self, **kwargs):
        super().__init__(**kwargs)

