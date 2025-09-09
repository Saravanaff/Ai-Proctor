from ultralytics import YOLO
import numpy as np
from threading import Lock

yolo_lock = Lock()
yolo_model = YOLO("yolov8m.pt")

def detect_person_and_objects(image: np.ndarray) -> tuple[int, dict]:
    with yolo_lock:
        
        result = yolo_model.predict(image, verbose=False)[0]

    detected_objects = {"Person": 0, "Mobile": 0, "Laptop": 0}


    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        if label == "person":
            detected_objects["Person"] += 1
        elif label == "cell phone":
            detected_objects["Mobile"] += 1
        elif label == "laptop":
            detected_objects["Laptop"] += 1

    return detected_objects

