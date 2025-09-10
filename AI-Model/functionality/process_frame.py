import numpy as np
import cv2
import face_recognition
from functionality.head_position import head_for_scan
from concurrent.futures import ThreadPoolExecutor
from core import constants
import json
import os
import threading


file_lock = threading.Lock()
data_path = "storage/face_data.json"
stage_arr=["Forward","Right","Left"]
MAX_WORKERS = 4  # Adjust based on your server capacity
thread_local = threading.local()
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

thread_local = threading.local()


def store_data(encodings, angle, userId):
    if len(encodings) != 1:
        print("Expect exactly 1 face, found", len(encodings))
        return False

    encoding = encodings[0].tolist()
    userId = str(userId)
    angle_key = str(angle)  # "0", "1", "2"

    with file_lock:
        # Load existing data
        if os.path.exists(data_path):
            with open(data_path, "r") as f:
                try:
                    stored_data = json.load(f)
                    if not isinstance(stored_data, list):
                        stored_data = []
                except json.JSONDecodeError:
                    stored_data = []
        else:
            stored_data = []

        # Find user entry
        user_entry = None
        for entry in stored_data:
            if entry.get("userId") == userId:
                user_entry = entry
                break

        # If user not found → must start at angle 0
        if not user_entry:
            if angle != 0:
                print(f"New user {userId} must start with angle 0")
                return False
            user_entry = {"userId": userId, "0": encoding}
            stored_data.append(user_entry)
            print(f"New user {userId} started at angle 0")
        else:
            # If angle == 0 → reset user data and start fresh
            if angle == 0:
                user_entry.clear()
                user_entry["userId"] = userId
                user_entry["0"] = encoding
                print(f"User {userId} restarted with new data at angle 0")
            else:
                # Must be sequential: allow only if last angle exists
                expected_key = str(len(user_entry) - 1)  # subtract 1 for userId
                if angle_key in user_entry:
                    print(f"Angle {angle_key} already exists for user {userId}")
                    return False
                elif angle_key != expected_key:
                    print(f"Rejecting: expected {expected_key}, got {angle_key}")
                    return False
                else:
                    user_entry[angle_key] = encoding
                    print(f"Added embedding for user {userId} at angle {angle_key}")

        # Save back atomically
        
        with open(data_path, "w") as f:
            json.dump(stored_data, f, indent=2)

    return True



def get_recognizer():
    if not hasattr(thread_local, "face_recognizer"):
        thread_local.face_recognizer = face_recognition
    return thread_local.face_recognizer


def process_frame_data(buffer, userId, examId, counter, stage):
    success = False
    image_array = np.frombuffer(buffer, dtype=np.uint8)
    img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)
    small_img = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
    rgb_small = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)
    face_model = get_recognizer()
    faces_fr = face_model.face_locations(rgb_small)
    encodings = face_model.face_encodings(rgb_small, faces_fr)
    head = head_for_scan(rgb_small)

    if stage_arr[stage] == head: 
        if(len(faces_fr)>0):
            counter+=1
    else:
        counter = 0

    if head == stage_arr[stage] and len(faces_fr) >0 :
        print("store called")
        if(store_data(encodings,stage,userId)):
            success=True
        else: 
            print("Failure")
            print("store exit")
    
    result_data = {
        "userId":userId,
        "examId":examId,
        "face_found": len(faces_fr) > 0,
        "head_position": head,
        "stage":stage,
        "counter":counter,
        "success":success,

    }
    print(result_data)

    return result_data


def setup_process_frame_handler(sio):
    @sio.on("process-frame")
    def handle_frame(data):
        buffer = data["buffer"]
        userId=data["user_id"]
        examId=data["exam_id"]
        counter=data["counter"]
        stage=data["stage"]

        future = executor.submit(process_frame_data, buffer, userId, examId, counter, stage)

        def emit_result(future):
            try:
                result = future.result()
                if sio.connected:
                    sio.emit("result", result)
            except Exception as e:
                print(f"Error in frame processing: {e}")

        future.add_done_callback(emit_result)


def cleanup_frame_functionality():
    """Cleanup function to properly shutdown the thread pool"""
    global executor
    if executor:
        executor.shutdown(wait=True)
        print("Process Frame thread pool shutdown complete")