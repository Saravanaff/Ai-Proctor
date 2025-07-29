import os
import json
import numpy as np
import cv2
import face_recognition
import threading

face_data_lock = threading.Lock()
data_path = "storage/face_data.json"

def setup_save_face_data_handler(sio):
    @sio.on("save-face-data")
    def save_face_data(data):
        with face_data_lock:
            try:
                print("📝 Saving face data...")
                blob = data["buffer"]
                name = data["name"]
                angle = data["angle"] #1 front , 2 right, 3 left;
    
                image_array = np.frombuffer(blob, dtype=np.uint8)
                img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    
                if img is None:
                    print("Could not decode image")
                    sio.emit("face_data_saved", {"status": False, "reason": "Image decode failed"})
                    return
                
                h, w = img.shape[:2]
                crop_w, crop_h = 640, 640
    
                if h >= crop_h and w >= crop_w:
                    x_start = (w - crop_w) // 2
                    y_start = (h - crop_h) // 2
                    img = img[y_start:y_start+crop_h, x_start:x_start+crop_w]
                else:
                    print(f"Image too small to crop: got ({w}x{h})")
                    sio.emit("face_data_saved", {"status": False, "reason": "Image too small for cropping"})
                    return
                
                # 👇 Save the decoded image for debugging
                debug_dir = "debug_faces"
                os.makedirs(debug_dir, exist_ok=True)
                image_path = os.path.join(debug_dir, f"{name}_angle{angle}.jpg")
                cv2.imwrite(image_path, img)
                print(f"Saved image to {image_path}")
    
    
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                
    
                print("Image dtype:", rgb_img.dtype, "Shape:", rgb_img.shape)
    
                try:
                    face_locations = face_recognition.face_locations(rgb_img)
                except Exception as e:
                    print("Face_locations crashed:",e)
                    sio.emit("face_data_saved",{"status":False,"reason":"Face detection failed"})   
                    return         
    
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
                if angle_str not in ["1","2","3"]:
                    print("Invalid angle value: ",angle)
                    sio.emit("face_data_saved",{"status":False,"reason":"Invalid angle"})
                    return
    
                update = False
                for entry in stored_entry:
                    if entry["name"] == name:
                        entry[angle_str] = encoding
                        update = True
                        break
                    
                if not update:
                    face_data={"name":name,angle_str:encoding}
                    stored_entry.append(face_data)
                    print("New face data added for:", name)
    
                with open(data_path, "w") as f:
                    json.dump(stored_entry, f, indent=2)
    
                sio.emit("face_data_saved", {"status": True})
                print("Face data saved successfully")
    
            except Exception as e:
                print("🚨 Error saving face data:", e)
                sio.emit("face_data_saved", {"status": False})