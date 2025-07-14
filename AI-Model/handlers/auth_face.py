import numpy as np
import json
import face_recognition

frame_count=0
def setup_auth_face_handler(sio):
    @sio.on("auth_face")
    def face_auth(data):
        try:
            global frame_count
            frame_count+=1
            if(frame_count%10==0):
                return
            print("Authentication process starts..")
            blob = data["buffer"]
            name = data["name"]
            encoding_array = np.frombuffer(blob, dtype=np.float32)

            if encoding_array.shape[0] != 128:
                sio.emit("auth_result", {"status": False, "message": "Invalid encoding size"})
                return

            with open("storage/face_data.json", "r") as f:
                stored_data = json.load(f)

            if isinstance(stored_data, dict):
                stored_data = [stored_data]

            target = next((entry for entry in stored_data if entry["name"] == name), None)

            if not target:
                sio.emit("auth_result", {"status": False, "reason": "User not found"})
                return

            stored_encoding = np.array(target["encoding"])
            match = face_recognition.compare_faces([stored_encoding], encoding_array)
            distance = face_recognition.face_distance([stored_encoding], encoding_array)[0]

            if match[0]:
                print(f"Authenticated: {name}, Distance: {distance:.4f}")
                sio.emit("auth_result", {"status": True, "reason": "Face matched"})
            else:
                print("Face Mismatch")
                sio.emit("auth_result", {"status": False, "reason": "Face Mismatch"})

        except Exception as e:
            print("Error in face_auth", e)
            sio.emit("auth_result", {"status": False, "reason": str(e)})