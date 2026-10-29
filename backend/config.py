import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'super-secret-key-change-in-production'
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))
    
    # Handle cloud PostgreSQL URLs (e.g., Render, Heroku, Supabase, Neon)
    _raw_db = os.environ.get('DATABASE_URL')
    if _raw_db and _raw_db.startswith("postgres://"):
        _raw_db = _raw_db.replace("postgres://", "postgresql://", 1)
        
    SQLALCHEMY_DATABASE_URI = _raw_db or f"sqlite:///{os.path.join(BASE_DIR, 'attendance.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or 'super-secret-jwt-key'
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(days=7)
    
    # Geofence default settings (customizable via Cloud Env)
    DEFAULT_LATITUDE = float(os.environ.get('DEFAULT_LATITUDE', 15.1684))
    DEFAULT_LONGITUDE = float(os.environ.get('DEFAULT_LONGITUDE', 76.8505))
    DEFAULT_RADIUS_METERS = float(os.environ.get('DEFAULT_RADIUS_METERS', 500))
