from ultralytics import YOLO
import numpy as np
from . import constants

yolo_model = YOLO("yolov8m.pt")

def detect_person_and_objects(image: np.ndarray) -> tuple[int, dict]:
    with constants.yolo_lock:
        constants.processing_yolo = True
        result = yolo_model.predict(image, verbose=False)[0]
        constants.processing_yolo = False

    constants.detected_objects = {"person": False, "cell phone": False}
    constants.person_count = 0

    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        if label == "person":
            constants.detected_objects["person"] = True
            constants.person_count += 1
        elif label == "cell phone":
            constants.detected_objects["cell phone"] = True

    return constants.person_count, constants.detected_objects
