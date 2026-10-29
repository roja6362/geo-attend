import math
from models import Settings

def haversine_distance(lat1, lon1, lat2, lon2):
    # Radius of earth in kilometers
    R = 6371.0
    
    # Convert latitude and longitude to radians
    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)
    
    # Differences
    dlon = lon2_rad - lon1_rad
    dlat = lat2_rad - lat1_rad
    
    # Haversine formula
    a = math.sin(dlat / 2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon / 2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    
    # Distance in meters
    distance = R * c * 1000
    return distance

def verify_location(user_lat, user_lon):
    # Fetch settings from database
    center_lat_setting = Settings.query.filter_by(key='DEFAULT_LATITUDE').first()
    center_lon_setting = Settings.query.filter_by(key='DEFAULT_LONGITUDE').first()
    radius_setting = Settings.query.filter_by(key='DEFAULT_RADIUS_METERS').first()
    
    if not all([center_lat_setting, center_lon_setting, radius_setting]):
        # Fallback if settings are not found (return 4-element tuple for unpacking)
        return False, 0.0, 0.0, 0.0
        
    center_lat = float(center_lat_setting.value)
    center_lon = float(center_lon_setting.value)
    allowed_radius = float(radius_setting.value)
    
    distance = haversine_distance(center_lat, center_lon, user_lat, user_lon)
    
    is_inside = distance <= allowed_radius
    
    return is_inside, distance, center_lat, center_lon
