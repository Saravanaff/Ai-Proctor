from ultralytics import YOLO
import numpy as np
from threading import Lock


mobile_lock = Lock()
yolo_model = YOLO("yolov8m.pt")

def third_eye_detect(image: np.ndarray) -> tuple[int, dict]:
    with mobile_lock:
        result = yolo_model.predict(image, verbose=False)[0]

    third_eye_objects = {"Person": 0, "Mobile": 0, "Laptop": 0}

    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        if label == "person":
            third_eye_objects["Person"] += 1
        elif label == "cell phone":
            third_eye_objects["Mobilee"] += 1
        elif label == "laptop":
            third_eye_objects["Laptop"] += 1

    return third_eye_objects