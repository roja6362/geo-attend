import cv2
import numpy as np
import base64
import os

# Load OpenCV pre-trained Haar Cascades for facial feature and expression analysis
face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
smile_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_smile.xml')

def base64_to_cv2(base64_string):
    """Decode base64 string into OpenCV BGR numpy image"""
    if not base64_string:
        return None
    if "base64," in base64_string:
        base64_string = base64_string.split("base64,")[1]
    
    try:
        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception:
        return None

def analyze_passive_anti_spoofing(img, face_rect=None):
    """
    Analyzes micro-textures, color spectrum, and screen glare artifacts.
    Prevents printed paper photos and smartphone LCD screen replay attacks.
    """
    if img is None:
        return False, 0.0, "Invalid image data"

    h, w = img.shape[:2]
    
    # If face rect is given, crop to face ROI, otherwise use center region
    if face_rect is not None:
        x, y, fw, fh = face_rect
        face_roi = img[max(0, y):min(h, y + fh), max(0, x):min(w, x + fw)]
    else:
        face_roi = img

    if face_roi.size == 0:
        face_roi = img

    gray_face = cv2.cvtColor(face_roi, cv2.COLOR_BGR2GRAY)

    # 1. Laplacian Texture Sharpness & Micro-Pattern Analysis
    laplacian_var = cv2.Laplacian(gray_face, cv2.CV_64F).var()

    # Low-res paper printouts or blurry screen photos have very low variance (< 25)
    # Extremely noisy digital screens with pixel moiré patterns have huge variance (> 25000)
    is_texture_valid = 25.0 <= laplacian_var <= 25000.0

    # 2. Chrominance & Skin Tone Depth Analysis (YCrCb Color Space)
    # Human skin under genuine 3D ambient light has rich dispersion in Cr (red) & Cb (blue)
    ycrcb = cv2.cvtColor(face_roi, cv2.COLOR_BGR2YCrCb)
    y_chan, cr_chan, cb_chan = cv2.split(ycrcb)
    cr_std = np.std(cr_chan)
    cb_std = np.std(cb_chan)
    chroma_dispersion = float(cr_std + cb_std)

    # Screen re-broadcasts or black/white printouts have flat chroma dispersion
    is_chroma_valid = chroma_dispersion > 5.0

    # 3. Specular Reflection / Screen Glare Detection
    # Digital displays (phones/monitors) frequently have concentrated pure-white glare spots
    hsv = cv2.cvtColor(face_roi, cv2.COLOR_BGR2HSV)
    v_chan = hsv[:, :, 2]
    s_chan = hsv[:, :, 1]
    glare_pixels = np.sum((v_chan > 248) & (s_chan < 25))
    glare_ratio = glare_pixels / float(face_roi.shape[0] * face_roi.shape[1])
    is_glare_acceptable = glare_ratio < 0.16  # Less than 16% glare saturation

    # Compute Anti-Spoofing Confidence Score (0% to 100%)
    score = 65.0
    if is_texture_valid:
        score += 15.0
    if is_chroma_valid:
        score += 12.0
    if is_glare_acceptable:
        score += 7.5

    score = min(score, 99.5)
    is_anti_spoof_passed = bool(is_texture_valid and is_chroma_valid and is_glare_acceptable)

    reasons = []
    if not is_texture_valid:
        reasons.append("Unnatural surface texture (paper printout or low-res display suspected)")
    if not is_chroma_valid:
        reasons.append("Flat skin chrominance (monochrome or washed out screen suspected)")
    if not is_glare_acceptable:
        reasons.append("High screen specular reflection / glare detected")

    msg = "Anti-spoofing passed (Organic skin detected)" if is_anti_spoof_passed else "; ".join(reasons)
    return is_anti_spoof_passed, score, msg

def verify_liveness(curr_base64, prev_base64=None, challenge_type='auto'):
    """
    Comprehensive Liveness Verification Engine:
    1. Validates face presence
    2. Performs passive anti-spoofing (texture, color, glare)
    3. Evaluates dynamic challenge (smile, blink, or micro-movement)
    4. Detects frozen static photos
    """
    img_curr = base64_to_cv2(curr_base64)
    if img_curr is None:
        return {
            "liveness_passed": False,
            "liveness_score": 0.0,
            "challenge_passed": False,
            "challenge_type": challenge_type,
            "spoof_detected": True,
            "message": "Invalid current frame"
        }

    gray_curr = cv2.cvtColor(img_curr, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray_curr, scaleFactor=1.1, minNeighbors=4, minSize=(45, 45))
    if len(faces) == 0:
        # Fallback pass with more sensitive parameters for budget/low-light cameras
        faces = face_cascade.detectMultiScale(gray_curr, scaleFactor=1.05, minNeighbors=3, minSize=(35, 35))

    if len(faces) == 0:
        return {
            "liveness_passed": False,
            "liveness_score": 0.0,
            "challenge_passed": False,
            "challenge_type": challenge_type,
            "spoof_detected": False,
            "message": "No face found in camera view. Please position your face clearly."
        }

    # Select primary face
    primary_face = faces[0]
    fx, fy, fw, fh = primary_face

    # 1. Passive Anti-Spoofing Analysis
    anti_spoof_ok, passive_score, anti_spoof_msg = analyze_passive_anti_spoofing(img_curr, primary_face)

    # 2. Dynamic Challenge & Motion Check (if previous frame provided)
    challenge_passed = True
    challenge_details = "Verified"
    motion_score = 0.0
    is_motion_live = True

    if prev_base64:
        img_prev = base64_to_cv2(prev_base64)
        if img_prev is not None:
            # Resize prev to match curr if needed
            if img_prev.shape != img_curr.shape:
                img_prev = cv2.resize(img_prev, (img_curr.shape[1], img_curr.shape[0]))

            # Crop both to face region for precise motion detection
            prev_face = img_prev[max(0, fy):min(img_prev.shape[0], fy + fh), max(0, fx):min(img_prev.shape[1], fx + fw)]
            curr_face = img_curr[max(0, fy):min(img_curr.shape[0], fy + fh), max(0, fx):min(img_curr.shape[1], fx + fw)]

            if prev_face.shape == curr_face.shape and prev_face.size > 0:
                diff = cv2.absdiff(prev_face, curr_face)
                motion_score = float(np.mean(diff))

                # Check for completely frozen static photo (motion score < 0.35)
                # Live humans naturally have breathing, eye, and micro-head shifts
                if motion_score < 0.35:
                    is_motion_live = False
                    challenge_passed = False
                    challenge_details = "Static photo detected (Zero natural motion across frames)"

    # 3. Dynamic Action Challenge Evaluation
    face_roi_gray = gray_curr[fy:fy + fh, fx:fx + fw]

    if challenge_type == 'smile':
        # Analyze lower half of the face for smile
        lower_face = face_roi_gray[int(fh * 0.45):, :]
        smiles = smile_cascade.detectMultiScale(lower_face, scaleFactor=1.45, minNeighbors=10, minSize=(25, 15))
        has_smile = len(smiles) > 0

        # Also accept positive motion shift as smile movement
        if has_smile or motion_score > 1.2:
            challenge_passed = True
            challenge_details = "Smile detected successfully ✓"
        else:
            challenge_passed = False
            challenge_details = "Please smile clearly for liveness verification"

    elif challenge_type == 'blink':
        # Detect eyes in upper face
        upper_face = face_roi_gray[:int(fh * 0.65), :]
        eyes = eye_cascade.detectMultiScale(upper_face, scaleFactor=1.15, minNeighbors=3, minSize=(20, 20))
        
        # When blinking occurs between frames, motion score on eyes changes significantly
        if motion_score > 0.8 or len(eyes) >= 1:
            challenge_passed = True
            challenge_details = "Blink / Eye activity verified ✓"
        else:
            challenge_passed = False
            challenge_details = "Please blink eyes naturally"

    elif challenge_type in ['turn', 'turn_left', 'turn_right']:
        if motion_score > 1.2:
            challenge_passed = True
            challenge_details = "Head movement verified ✓"
        else:
            challenge_passed = False
            challenge_details = "Please turn head slightly as requested"

    # Overall Liveness Verdict
    overall_liveness = bool(anti_spoof_ok and is_motion_live and challenge_passed)
    final_score = round((passive_score * 0.7) + (min(motion_score * 10, 30.0)), 1)
    if not overall_liveness:
        final_score = min(final_score, 45.0)

    spoof_detected = not overall_liveness and (not is_motion_live or not anti_spoof_ok)
    message = "Liveness and Anti-Spoofing Verified" if overall_liveness else (
        challenge_details if not challenge_passed else anti_spoof_msg
    )

    return {
        "liveness_passed": overall_liveness,
        "liveness_score": final_score,
        "anti_spoof_passed": anti_spoof_ok,
        "challenge_passed": challenge_passed,
        "challenge_type": challenge_type,
        "motion_score": round(motion_score, 2),
        "spoof_detected": spoof_detected,
        "message": message
    }
