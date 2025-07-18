import json
import numpy as np
import face_recognition
from .constants import face_data_path

def authenticate_face(image: np.ndarray, name: str) -> bool:
    with open(face_data_path, "r") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
        except json.JSONDecodeError:
            print("❌ Corrupted JSON data.")
            return False

    target_entry = next((entry for entry in data if entry["name"] == name), None)
    if not target_entry:
        print(f"❌ No entry found for name: {name}")
        return False

    known_encoding = np.array(target_entry["encoding"])
    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)

    for face_encoding in face_encodings:
        if face_recognition.compare_faces([known_encoding], face_encoding)[0]:
            return True

    return False
