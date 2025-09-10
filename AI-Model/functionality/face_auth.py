import json
import numpy as np
import face_recognition
import cv2
from core import constants
from concurrent.futures import ThreadPoolExecutor
import threading

file_lock = threading.Lock()

MAX_WORKERS = 4  # Adjust based on your server capacity
thread_local = threading.local()
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def get_face_recognition():
    if not hasattr(thread_local, 'face_recognition'):
        thread_local.face_recognition = face_recognition
    return thread_local.face_recognition

face_data_path = "storage/face_data.json"

def face_auth(sio):
    @sio.on("faceAuth")
    def add_in_queue(data):
        print("[face service] Received faceAuth request")
        constants.auth_queue.put(data)

def process_face_auth(buffer, userId, examId):
    face_recog = get_face_recognition()
    img_array = np.frombuffer(buffer, dtype=np.uint8)
    img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
    rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    face_locations = face_recognition.face_locations(rgb_img)
    if not face_locations:
            print("[face service] No faces detected in the image.")
            result = {
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            }
            return result
    face_encoding = face_recognition.face_encodings(rgb_img, face_locations)[0]
    with file_lock:
        with open(face_data_path, "r") as f:
            try:
                data = json.load(f)
                if isinstance(data, dict):
                    data = [data]
            except json.JSONDecodeError:
                print("[face service] Corrupted JSON data.")
                result ={
                    "userId": userId,
                    "examId": examId,
                    "code": -1,
                    "auth": False
                }
                return result
            
        target_entry = next((entry for entry in data if entry["userId"] == userId), None)
        if not target_entry:
            print(f"[face service] No entry found for userId: {userId}")
            result ={
                "userId": userId,
                "examId": examId,
                "code": -1,
                "auth": False
            }
            return result
    
    stored_encodings = [np.array(e) for e in target_entry["embedding"]]
    
    threshold = 0.6

    for stored_encoding in stored_encodings:
        distance = np.linalg.norm(stored_encoding - face_encoding)
        if distance < threshold:
            print("[face service] Face authenticated successfully.")
            result = {
                "userId": userId,
                "examId": examId,
                "code": 0,
                "auth": True
            }
            return result

    result = {
        "userId": userId,
        "examId": examId,
        "code": 0,
        "auth": False
    }
    return result
        
    




def handle_face_auth(sio):
    while True:
        data = constants.auth_queue.get()
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]

        future = executor.submit(process_face_auth, buffer, userId, examId)

        def emit_result(future):
            try:
                result = future.result()
                if sio.connected:
                    sio.emit("faceAuthRes", result)
            except Exception as e:
                print(f"Error in face authentication processing: {e}")
                error_result = {
                    "userId": userId,
                    "examId": examId,
                    "code": -1,
                    "auth": False
                }
                if sio.connected:
                    sio.emit("faceAuthRes", error_result)
        
        future.add_done_callback(emit_result)

def cleanup_face_auth():
    """Cleanup function to properly shutdown the thread pool"""
    global executor
    if executor:
        executor.shutdown(wait=True)
        print("Face authentication thread pool shutdown complete")


        

        
        
            

