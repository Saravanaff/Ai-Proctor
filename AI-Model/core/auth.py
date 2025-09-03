import json
import numpy as np
import face_recognition
from .constants import face_data_path

def authenticate_face(image: np.ndarray, userId: str) -> bool:
    
    with open(face_data_path, "r") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
        except json.JSONDecodeError:
            print("❌ Corrupted JSON data.")
            return False

    target_entry = next((entry for entry in data if entry["userId"] == userId), None)
    if not target_entry:
        print(f"❌ No entry found for userId: {userId}")
        return False
    stored_encoding = [
        np.array(target_entry["embedding"][0]), 
    ]

    face_locations = face_recognition.face_locations(image)
    if not face_locations:
        print("❌ No faces detected in the image.")
        return False
    
    face_encoding = face_recognition.face_encodings(image, face_locations)[0]

    distance = np.linalg.norm(stored_encoding - face_encoding)
    threshold = 0.6

    if distance < threshold:
        print("✅ Face authenticated successfully.")
        return True
    
    return False
