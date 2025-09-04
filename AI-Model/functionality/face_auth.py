import json
import numpy as np
import face_recognition
import cv2

face_data_path = "storage/face_data.json"

def face_auth(sio):
    @sio.on("faceAuth")
    def handle_face_auth(data):
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        img_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        
        with open(face_data_path, "r") as f:
            try:
                data = json.load(f)
                if isinstance(data, dict):
                    data = [data]
            except json.JSONDecodeError:
                print("[face service] Corrupted JSON data.")
                sio.emit("faceRecognizeRes", {
                    "userId": userId,
                    "examId": examId,
                    "code": -1,
                    "auth": False
                })
                return
            
        target_entry = next((entry for entry in data if entry["userId"] == userId), None)
        if not target_entry:
            print(f"[face service] No entry found for userId: {userId}")
            sio.emit("faceRecognizeRes", {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            })
            return
        
        stored_encodings = [np.array(e) for e in target_entry["embedding"]]
        face_locations = face_recognition.face_locations(rgb_img)
        if not face_locations:
            print("[face service] No faces detected in the image.")
            sio.emit("faceRecognizeRes", {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            })
            return
        
        face_encoding = face_recognition.face_encodings(rgb_img, face_locations)[0]
        threshold = 0.6

        for stored_encoding in stored_encodings:
            distance = np.linalg.norm(stored_encoding - face_encoding)
            if distance < threshold:
                print("[face service] Face authenticated successfully.")
                sio.emit("faceRecognizeRes", {
                    "userId": userId,
                    "examId": examId,
                    "code": 0,
                    "auth": True
                })
                return
        
        sio.emit("faceRecognizeRes", {
            "userId": userId,
            "examId": examId,
            "code": 0,
            "auth": False
        })
        
            

