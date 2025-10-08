import json
import numpy as np
import cv2
import face_recognition
import os

data_path = "storage/face_data.json"

def face_store(sio):
    @sio.on("faceStore")
    def handle_face_store(data):
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        angle = data["angle"]
        img_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        face_locations = face_recognition.face_locations(rgb_img)
        if len(face_locations) != 1:
            print("[face_store service] Expect exactly 1 face, found", len(face_locations))
            sio.emit("faceStoreRes", {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "stored": False
            })
            return

        encodings = face_recognition.face_encodings(rgb_img, face_locations)
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

        if angle not in {0, 1, 2}:
            print("[face_store service] Invalid angle value:", angle)
            sio.emit("faceStoreRes", {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "angle": angle,
                "stored": False
            })
            return
        
        user_found = False
        for entry in stored_entry:
            if entry["userId"] == userId:
                user_found = True
                if "embedding" not in entry:
                    entry["embedding"] = []

                if len(entry["embedding"]) == angle:
                    entry["embedding"].append(encoding)
                    print(f"[face_store service] Added embedding at angle {angle} for user {userId}")
                else:
                    print(f"[face_store service] Rejecting: expected embedding length {angle}, "
                          f"found {len(entry['embedding'])}")
                    sio.emit("faceStoreRes", {
                        "userId": userId,
                        "examId": examId,
                        "code": -1,
                        "angle": angle,
                        "stored": False
                    })
                    return
                break

        if not user_found:
            if angle != 0:
                print("[face_store service] New user must start with angle 0")
                sio.emit("faceStoreRes", {
                    "userId": userId,
                    "examId": examId,
                    "code": -1,
                    "angle": angle,
                    "stored": False
                })
                return
            face_data = {"userId": userId, "embedding": [encoding]}
            stored_entry.append(face_data)
        
        with open(data_path, "w") as f:
            json.dump(stored_entry, f, indent=2)

        sio.emit("faceStoreRes", {
            "userId": userId,
            "examId": examId,
            "code": 0,
            "angle": angle,
            "stored": True
        })
