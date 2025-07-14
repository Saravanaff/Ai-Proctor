import os
import json
import numpy as np
import cv2
import face_recognition

data_path = "storage/face_data.json"

def setup_save_face_data_handler(sio):
    @sio.on("save-face-data")
    def save_face_data(data):
        try:
            print("📝 Saving face data...")
            blob = data["buffer"]
            name = data["name"]

            image_array = np.frombuffer(blob, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if img is None:
                print("Could not decode image")
                sio.emit("face_data_saved", {"status": False, "reason": "Image decode failed"})
                return


            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

            face_locations = face_recognition.face_locations(rgb_img)
            print("Face count: ", len(face_locations))

            if len(face_locations) != 1:
                print("Expect exactly 1 face, found", len(face_locations))
                sio.emit("face_data_saved", {"status": False, "reason": "Must have exactly one face"})
                return

            try:
                encodings = face_recognition.face_encodings(rgb_img, face_locations)
            except Exception as e:
                print("Encoding failed:", e)
                sio.emit("face_data_saved", {"status": False, "reason": "Face encoding failed"})
                return

            if len(encodings) == 0:
                print("Failed to extract face encoding")
                sio.emit("face_data_saved", {"status": False, "reason": "Face encoding failed"})
                return

            encoding = encodings[0].tolist()
            face_data = {"name": name, "encoding": encoding}

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

            update = False
            for entry in stored_entry:
                if entry["name"] == name:
                    entry["encoding"] = encoding
                    update = True
                    break

            if not update:
                stored_entry.append(face_data)
                print("New face data added for:", name)

            with open(data_path, "w") as f:
                json.dump(stored_entry, f, indent=2)

            sio.emit("face_data_saved", {"status": True})
            print("Face data saved successfully")

        except Exception as e:
            print("🚨 Error saving face data:", e)
            sio.emit("face_data_saved", {"status": False})