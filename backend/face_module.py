import os
os.environ["DEEPFACE_HOME"] = os.path.abspath(os.path.dirname(__file__))

import cv2
import numpy as np
import base64
from deepface import DeepFace

# Ensure face recognition weights exist in cloud environments
try:
    from download_weights import download_weights
    download_weights()
except Exception as _e:
    pass

# Ensure temp directory exists for intermediate images if needed by deepface
TEMP_DIR = os.path.join(os.path.dirname(__file__), 'temp')
if not os.path.exists(TEMP_DIR):
    os.makedirs(TEMP_DIR)

def base64_to_cv2(base64_string):
    """Convert base64 image string to cv2 image"""
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    
    img_data = base64.b64decode(base64_string)
    nparr = np.frombuffer(img_data, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return img

def get_face_encoding(base64_string, student_id):
    """
    Extracts face embedding using DeepFace. 
    Saves the image temporarily for processing.
    """
    try:
        img = base64_to_cv2(base64_string)
        if img is None:
            return None, "Invalid image data"
            
        temp_path = os.path.join(TEMP_DIR, f"temp_{student_id}.jpg")
        cv2.imwrite(temp_path, img)
        
        # We can extract embeddings or just save the image as the "registered face"
        # Since DeepFace handles verification nicely with image files, 
        # let's extract the embedding as a list of floats to store in the DB
        
        embedding_objs = DeepFace.represent(img_path=temp_path, model_name="Facenet", enforce_detection=True)
        
        os.remove(temp_path)
        
        if len(embedding_objs) == 0:
            return None, "No face detected"
        if len(embedding_objs) > 1:
            return None, "Multiple faces detected"
            
        # Return the embedding vector
        return embedding_objs[0]["embedding"], "Success"
        
    except ValueError as e:
        return None, str(e)
    except Exception as e:
        return None, f"Face extraction error: {str(e)}"

def verify_face(live_base64, registered_embedding):
    """
    Verifies a live base64 image against a stored embedding.
    We'll extract the live embedding and calculate cosine similarity.
    """
    try:
        img = base64_to_cv2(live_base64)
        if img is None:
            return False, 0.0, "Invalid live image data"
            
        # Convert BGR (OpenCV default) to RGB (DeepFace default) to prevent channel swapping
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Extract embedding for the live image
        live_embedding_objs = DeepFace.represent(img_path=img_rgb, model_name="Facenet", enforce_detection=True)
        
        if len(live_embedding_objs) == 0:
            return False, 0.0, "No face detected in live image"
        if len(live_embedding_objs) > 1:
            return False, 0.0, "Multiple faces detected in live image"
            
        live_embedding = live_embedding_objs[0]["embedding"]
        
        # Calculate Cosine Distance
        a = np.array(live_embedding)
        b = np.array(registered_embedding)
        
        dot_product = np.dot(a, b)
        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)
        similarity = dot_product / (norm_a * norm_b)
        
        # Facenet cosine similarity threshold is typically around 0.4 distance (so 0.6 similarity)
        # DeepFace threshold for Facenet cosine is 0.4 distance.
        # Cosine distance = 1 - cosine_similarity. So distance < 0.4 means similarity > 0.6
        distance = 1 - similarity
        
        is_match = bool(distance < 0.40)
        confidence = float(similarity * 100)
        
        return is_match, confidence, "Success"
        
    except ValueError as e:
        return False, 0.0, f"No face found: {str(e)}"
    except Exception as e:
        return False, 0.0, f"Verification error: {str(e)}"
