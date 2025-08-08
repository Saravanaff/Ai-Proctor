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

def overlap_ratio(boxA, boxB):
    xA = max(boxA[0], boxB[0])
    yA = max(boxA[1], boxB[1])
    xB = min(boxA[2], boxB[2])
    yB = min(boxA[3], boxB[3])

    interArea = max(0, xB - xA) * max(0, yB - yA)
    boxAArea = (boxA[2] - boxA[0]) * (boxA[3] - boxA[1])
    boxBArea = (boxB[2] - boxB[0]) * (boxB[3] - boxB[1])

    if boxAArea == 0 or boxBArea == 0:
        return 0

    return interArea / float(min(boxAArea, boxBArea))


def thirdeye_object_detect(image: np.ndarray) -> dict:
    with constants.yolo_lock:
        constants.processing_yolo = True
        result = yolo_model.predict(
            image,
            verbose=False,
            agnostic_nms=True,
            iou=0.3,  
            conf=0.25
        )[0]
        constants.processing_yolo = False

    constants.third_eye_objects = {
        "person": 0,
        "laptop": 0,
        "unauth_device": False,
    }

    laptops = []
    mobiles = []

    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        x1, y1, x2, y2 = map(int, box.xyxy[0])

        if label == "person":
            constants.third_eye_objects["person"] += 1
        elif label == "laptop":
            constants.third_eye_objects["laptop"] += 1
            laptops.append((x1, y1, x2, y2))
        elif label in ["cell phone", "mobile phone"]:
            constants.third_eye_objects["unauth_device"] = True
            mobiles.append((x1, y1, x2, y2))

    for lap in laptops:
        for mob in mobiles:
            if overlap_ratio(lap, mob) > 0.2:
                constants.third_eye_objects["unauth_device"] = True

    return constants.third_eye_objects
