from flask import Blueprint, request, jsonify
from models import db, User
import bcrypt
from flask_jwt_extended import create_access_token

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    if not data or not data.get('email') or not data.get('password') or not data.get('name'):
        return jsonify({"msg": "Missing required fields"}), 400
        
    email = str(data.get('email', '')).strip().lower()
    if User.query.filter_by(email=email).first():
        return jsonify({"msg": "Email already registered"}), 400
        
    role = data.get('role', 'student')
    if role not in ['student', 'teacher', 'admin']:
        return jsonify({"msg": "Invalid role"}), 400
        
    hashed_password = bcrypt.hashpw(data.get('password').encode('utf-8'), bcrypt.gensalt())
    
    new_user = User(
        name=str(data.get('name', '')).strip(),
        email=email,
        password=hashed_password.decode('utf-8'),
        role=role,
        usn=str(data.get('usn', '')).strip() if role == 'student' else None,
        department=data.get('department'),
        semester=data.get('semester'),
        phone_number=data.get('phone_number'),
    )
    
    image = data.get('image') or data.get('face_image')
    if image:
        try:
            from face_module import get_face_encoding
            import json
            embedding, msg = get_face_encoding(image, email)
            if embedding:
                new_user.face_encoding = json.dumps(embedding)
        except Exception as e:
            print("Face encoding extraction warning:", e)
            
    db.session.add(new_user)
    db.session.commit()
    
    return jsonify({"msg": "User registered successfully", "user_id": new_user.id}), 201

@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.json
    
    if not data or not data.get('email') or not data.get('password'):
        return jsonify({"msg": "Missing email or password"}), 400
        
    email = str(data.get('email', '')).strip().lower()
    password = str(data.get('password', ''))
    
    user = User.query.filter_by(email=email).first()
    
    if not user or not bcrypt.checkpw(password.encode('utf-8'), user.password.encode('utf-8')):
        return jsonify({"msg": "Invalid email or password"}), 401
        
    import json
    access_token = create_access_token(identity=json.dumps({'id': user.id, 'role': user.role, 'name': user.name}))
    
    return jsonify({
        "msg": "Login successful",
        "access_token": access_token,
        "user": {
            "id": user.id,
            "name": user.name,
            "role": user.role,
            "email": user.email
        }
    }), 200
