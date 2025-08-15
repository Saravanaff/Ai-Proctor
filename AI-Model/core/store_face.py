import json
import numpy as np
import cv2
import face_recognition
import os


data_path = "storage/face_data.json"

def store_data(image,face_locations,angle,userId):
    
    print("Face count: ", len(face_locations))

    if len(face_locations) != 1:
        print("Expect exactly 1 face, found", len(face_locations))
        return False
    
    encodings = face_recognition.face_encodings(image, face_locations)

    encoding = encodings[0].tolist()

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

    angle_str=str(angle)
    if angle_str not in {"0","1", "2", "3","4"}:
        print("Invalid angle value: ",angle)
        return False
    
     
    update = False
    for entry in stored_entry:
        if entry["userId"] == userId:
            entry[angle_str] = encoding
            update = True
            break
                    
    if not update:
        face_data={"userId":userId,angle_str:encoding}
        stored_entry.append(face_data)
        print("New face data added for:", userId)

    
    with open(data_path, "w") as f:
        json.dump(stored_entry, f, indent=2)

    return True

    