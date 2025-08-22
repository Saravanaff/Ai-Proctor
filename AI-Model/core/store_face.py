import json
import numpy as np
import cv2
import face_recognition
import os

data_path = "storage/face_data.json"

def store_data(image, face_locations, angle, userId):
    print("Face count:", len(face_locations))
    print("Stage no:", angle)

    if len(face_locations) != 1:
        print("Expect exactly 1 face, found", len(face_locations))
        return False

    encodings = face_recognition.face_encodings(image, face_locations)
    encoding = encodings[0].tolist()

    # Load existing data
    if os.path.exists(data_path):
        with open(data_path, "r") as f:
            try:
                stored_entry = json.load(f)
                if isinstance(stored_entry, dict):
                    stored_entry = [stored_entry]
            except json.JSONDecodeError:
                stored_entry = []
    else:
        stored_entry = []

    # Validate angle
    if angle not in {0, 1, 2}:
        print("Invalid angle value:", angle)
        return False

    # Look for existing user
    user_found = False
    for entry in stored_entry:
        if entry["userId"] == userId:
            user_found = True
            if "embedding" not in entry:
                entry["embedding"] = []

            # ✅ Enforce strict sequential insertion
            if len(entry["embedding"]) == angle:
                entry["embedding"].append(encoding)
                print(f"Added embedding at angle {angle} for user {userId}")
            else:
                print(f"Rejecting: expected embedding length {angle}, "
                      f"found {len(entry['embedding'])}")
                return False
            break

    # If user not found, must start with angle 0
    if not user_found:
        if angle != 0:
            print("New user must start with angle 0")
            return False
        face_data = {"userId": userId, "embedding": [encoding]}
        stored_entry.append(face_data)
        print("New face data added for:", userId)

    # Save back to file
    with open(data_path, "w") as f:
        json.dump(stored_entry, f, indent=2)

    return True
