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
    stored_encodings = [
        np.array(target_entry["embedding"][0]), 
    ]

    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)

    for face_encoding in face_encodings:
        results = face_recognition.compare_faces(stored_encodings, face_encoding)
        if any(results):
            return True
    
    return False
