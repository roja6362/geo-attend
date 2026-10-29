from flask import Flask, jsonify, request
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from config import Config
from models import db, User, Settings
import bcrypt
import os

app = Flask(__name__)
app.config.from_object(Config)

# Initialize extensions
CORS(app)
db.init_app(app)
jwt = JWTManager(app)

# Import routes (we will create these next)
from routes.auth_routes import auth_bp
from routes.attendance_routes import attendance_bp
from routes.admin_routes import admin_bp
from routes.blockchain_routes import blockchain_bp
from routes.teacher_routes import teacher_bp

app.register_blueprint(auth_bp, url_prefix='/api/auth')
app.register_blueprint(attendance_bp, url_prefix='/api/attendance')
app.register_blueprint(admin_bp, url_prefix='/api/admin')
app.register_blueprint(blockchain_bp, url_prefix='/api/blockchain')
app.register_blueprint(teacher_bp, url_prefix='/api/teacher')

@app.route('/', methods=['GET'])
@app.route('/api/health', methods=['GET'])
def index():
    return jsonify({"status": "online", "message": "AI Geo-Attendance API is running"})

def setup_database():
    with app.app_context():
        db.create_all()
        # Create default admin if not exists
        admin = User.query.filter_by(role='admin').first()
        if not admin:
            hashed_password = bcrypt.hashpw('admin123'.encode('utf-8'), bcrypt.gensalt())
            new_admin = User(
                name='Super Admin',
                email='admin@college.edu',
                password=hashed_password.decode('utf-8'),
                role='admin'
            )
            db.session.add(new_admin)
            
            # Setup default geofence settings
            db.session.add(Settings(key='DEFAULT_LATITUDE', value=str(Config.DEFAULT_LATITUDE)))
            db.session.add(Settings(key='DEFAULT_LONGITUDE', value=str(Config.DEFAULT_LONGITUDE)))
            db.session.add(Settings(key='DEFAULT_RADIUS_METERS', value=str(Config.DEFAULT_RADIUS_METERS)))
            
            db.session.commit()
            print("Default admin user created: admin@college.edu / admin123")
            print("Default settings created.")
            
        # Create default teacher if not exists
        teacher = User.query.filter_by(role='teacher').first()
        if not teacher:
            hashed_teacher_pw = bcrypt.hashpw('teacher123'.encode('utf-8'), bcrypt.gensalt())
            new_teacher = User(
                name='Prof. Ramesh Kumar',
                email='teacher@college.edu',
                password=hashed_teacher_pw.decode('utf-8'),
                role='teacher',
                department='Computer Science'
            )
            db.session.add(new_teacher)
            db.session.commit()
            print("Default teacher created: teacher@college.edu / teacher123")
            
        # Seed default subjects if not exist
        from models import Subject
        if Subject.query.count() == 0:
            default_subjects = [
                ('Database Management Systems', 'CS501', 'Computer Science', 5),
                ('Artificial Intelligence & ML', 'CS502', 'Computer Science', 5),
                ('Computer Networks & Security', 'CS503', 'Computer Science', 5),
                ('Cloud & Distributed Systems', 'CS504', 'Computer Science', 5),
            ]
            t_obj = User.query.filter_by(role='teacher').first()
            t_id = t_obj.id if t_obj else None
            for name, code, dept, sem in default_subjects:
                db.session.add(Subject(name=name, code=code, department=dept, semester=sem, teacher_id=t_id))
            db.session.commit()
            print("Default subjects seeded.")

# Ensure DB and defaults are initialized whether run directly or via WSGI/Gunicorn
with app.app_context():
    try:
        setup_database()
    except Exception as e:
        print(f"Warning during DB setup: {e}")

if __name__ == '__main__':
    app.run(host='0.0.0.0', debug=True, use_reloader=False, port=5000)

