import socketio
import numpy as np
import cv2
import face_recognition
import time
import gc
import json
import os

sio = socketio.Client()

@sio.event
def connect():
    print("✅ Connected to Node.js socket server")
    sio.emit("register-python")

@sio.event
def disconnect():
    print("🔌 Disconnected from server")

last_processed_time = 0
<<<<<<< HEAD
frame_interval = 0.5  # process every 0.5 seconds
data_path = "storage/face_data.json"
=======
frame_interval = 0.5
>>>>>>> b5d6694ba1ecd400161ca5e1393797f7b397914a

@sio.on("process-frame")
def handle_frame(data):
    global last_processed_time

    if time.time() - last_processed_time < frame_interval:
        return

    try:
        last_processed_time = time.time()

        buffer = data["buffer"]
        metadata = data["metadata"]
        width, height = int(metadata["width"]), int(metadata["height"])
        print("width:", width, "height:", height)

        image_array = np.frombuffer(buffer, dtype=np.uint8)
        img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

        if img is None:
            print("⚠️ Failed to decode image")
            return

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        face_cascade = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
        faces_haar = face_cascade.detectMultiScale(
            gray, scaleFactor=1.1, minNeighbors=5
        )

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        faces_fr = face_recognition.face_locations(rgb_img)

        result_data = {
            "fr_faces": [list(map(int, face)) for face in fr_faces_scaled],
            "face_found": len(fr_faces_scaled) > 0,
        }

        sio.emit("result", result_data)

<<<<<<< HEAD
=======
        for (x, y, w, h) in faces_haar:
            cv2.rectangle(img, (x, y), (x + w, y + h), (0, 255, 0), 2)
        for top, right, bottom, left in faces_fr:
            cv2.rectangle(img, (left, top), (right, bottom), (255, 0, 0), 2)

        cv2.imshow("Detection", img)
        if cv2.waitKey(1) & 0xFF == ord("q"):
            sio.disconnect()
            cv2.destroyAllWindows()

>>>>>>> b5d6694ba1ecd400161ca5e1393797f7b397914a
        del img, small_img, rgb_small
        gc.collect()

    except Exception as e:
        print("🚨 Error:", e)

@sio.on("save-face-data")
def save_face_data(data):
    try:
        print("📝 Saving face data...")
        blob = data["blob"]
        name = data["name"]
        encoding_array = np.frombuffer(blob,dtype=np.float32)



        if encoding_array.shape[0] != 128:
            print("Received encoding size is not 128, Aborting....")
            return 
        
        encoding_array = encoding_array.tolist()

        face_data = {
            "name": name,
            "encoding": encoding_array
        }

        if os.path.exists(data_path):
            with open(data_path,"r") as f:
                try:
                    stored_entry= json.load(f)
                    if isinstance(stored_entry,dict):
                        stored_entry = [stored_entry]
                except json.JSONDecodeError:
                    stored_entry = []
        
        else:
            stored_entry=[]

        update = False
        for entry in stored_entry:
            if entry["name"] ==name:
                entry["encoding"] = encoding_array
                update = True
                print(f"Updated face data for {name}")
                break
        
        if not update:
            stored_entry.append(face_data)
            print(f"Added new face data {name}")

        with open(data_path,"w") as f:
            json.dump(stored_entry,f,indent = 2)
                    

        sio.emit("face_data_saved", {"status": True})
        print("Face data saved successfully")

    except Exception as e:
        print("🚨 Error saving face data:", e)


@sio.on("auth_face")
def face_auth(data):
    try:
        print("Authentication process starts..")
        blob = data["blob"]
        name = data["name"]
        encoding_array = np.frombuffer(blob, dtype=np.float32)
        if encoding_array.shape[0] != 128:
            print("Received encoding size is not 128, Aborting....")
            sio.emit("auth_result", {"status": False, "message": "Invalid encoding size"})
            return 
        
        with open("storage/face_data.json","r") as f:
            stored_data = json.load(f)

        if isinstance(stored_data, dict):
            stored_data = [stored_data]

        target = next((entry for entry in stored_data if entry["name"] == name),None)

        if not target:
            print(f"No face data found for {name}")
            sio.emit("auth_result", {"status":False,"reason":"User not found"})
            return 
        
        stored_encoding = np.array(target["encoding"])

        match = face_recognition.compare_faces([stored_encoding],encoding_array)
        distance = face_recognition.face_distance([stored_encoding],encoding_array)[0]

        if match[0]:
            print(f"Authenticated: {name} , Distance : {distance:.4f}")  
            sio.emit("auth_result",{"status":True, "reason":"Face matched"})
        else:
            print("Face Mismatch") 
            sio.emit("auth_result",{"status":False,"reason":"Face Mismatch"})

    except Exception as e:
        print("Error in a face_auth",e)
        sio.emit("auth_result",{"status":False, "reason":str(e)})     


        



sio.connect("http://localhost:3001")

try:
    while True:
        time.sleep(1)
except KeyboardInterrupt:
    sio.disconnect()
    cv2.destroyAllWindows()

