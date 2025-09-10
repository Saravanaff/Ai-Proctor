import time
import cv2
import numpy as np
from core import image_utils,constants
from concurrent.futures import ThreadPoolExecutor
import threading
from ultralytics import YOLO

MAX_WORKERS = 4  # Adjust based on your server capacity

thread_local = threading.local()
executor = ThreadPoolExecutor(max_workers=MAX_WORKERS)

def get_yolo_model():
    if not hasattr(thread_local, 'yolo_model'):
        thread_local.yolo_model = YOLO("yolov8m.pt")
    return thread_local.yolo_model

def detect_person_and_objects(image: np.ndarray):
    yolo_model = get_yolo_model()
    detected_objects = {"Person": 0, "Mobile": 0, "Laptop": 0}

    try:
        result = yolo_model.predict(image, verbose=False)[0]


        for box in result.boxes:
            label = yolo_model.names[int(box.cls[0])]
            if label == "person":
                detected_objects["Person"] += 1
            elif label == "cell phone":
                detected_objects["Mobile"] += 1
            elif label == "laptop":
                detected_objects["Laptop"] += 1
    except Exception as e:
        print(f"[WebDetect] YOLO detection error: {e}")

    return detected_objects


def process_webcam_data(buffer, userId, examId):
    img_array = image_utils.decode_image(buffer)
    rgb_img = cv2.cvtColor(img_array, cv2.COLOR_BGR2RGB)
    detected_objects = detect_person_and_objects(rgb_img)

    print(f"[WebDetect] Detected objects for user {userId}, exam {examId}: {detected_objects}")

    result = {
            "userId": userId,
            "examId": examId,
            "data": detected_objects,
            "code": 0
        }
    
    return result


def web_detect(sio):
    @sio.on("webDetect")
    def add_in_queue(data):
        constants.webdetect_queue.put(data)

def handle_web_detect(sio):
    while True:
        data = constants.webdetect_queue.get()
        buffer = data["buffer"]
        userId = data["userId"]
        examId = data["examId"]
        
        future = executor.submit(process_webcam_data, buffer, userId, examId)

        def emit_result(future):
            try:
                result = future.result()
                if sio.connected:
                    sio.emit("webDetectRes", result)
            except Exception as e:
                print(f"[WebDetect] Error in processing: {e}")
                error_result = {
                    "userId": userId,
                    "examId": examId,
                    "data": {},
                    "code": -1
                }
                if sio.connected:
                    sio.emit("webDetectRes", error_result)

        future.add_done_callback(emit_result)

def cleanup_web_functionality():
    """Cleanup function to properly shutdown the thread pool"""
    global executor
    if executor:
        executor.shutdown(wait=True)
        print("Web detect thread pool shutdown complete")