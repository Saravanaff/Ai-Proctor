from ultralytics import YOLO
import numpy as np
from . import constants

yolo_model = YOLO("yolov8m.pt")

def third_eye_detect(image: np.ndarray) -> tuple[int, dict]:
    with constants.mobile_lock:
        constants.processing_cam = True
        result = yolo_model.predict(image, verbose=False)[0]
        constants.processing_cam = False

    constants.third_eye_objects = {"Person": 0, "Mobile-phone": 0, "Laptop": 0}

    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        if label == "person":
            constants.third_eye_objects["Person"] += 1
            constants.person_count += 1
        elif label == "cell phone":
            constants.third_eye_objects["Mobile-phone"] += 1
        elif label == "laptop":
            constants.third_eye_objects["Laptop"] += 1

    return constants.third_eye_objects