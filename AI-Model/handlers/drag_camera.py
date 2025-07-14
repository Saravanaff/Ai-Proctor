import numpy as np
import cv2
import face_recognition
import mediapipe as mp
from ultralytics import YOLO
import json
import time
from threading import Lock

# Global variables
auth_status = False
head_position = "Forward"
frame_count = 0

detected_objects = {
    "person" : False,
    "cell phone": False,
}
person_count = 0

last_yolo_process = 0
last_head_process = 0
last_auth_process = 0


AUTH_INTERVAL = 1.0
HEAD_INTERVAL = 0.5

# Processing lock
yolo_lock = Lock()
auth_lock = Lock()
head_lock = Lock()
processing_yolo = False

# Model initialization
yolo_model = YOLO("yolov8n.pt")
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True)

face_data_path = "storage/face_data.json"

def decode_image(buffer: bytes) -> np.ndarray:
    np_data = np.frombuffer(bytes(buffer), dtype=np.uint8)
    image = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
    return image

def detect_person_and_objects(image: np.ndarray) -> tuple[int, dict]:
    global detected_objects, person_count, processing_yolo

    with yolo_lock:
        processing_yolo = True
        result = yolo_model.predict(image, verbose=False)[0]
        processing_yolo = False

    detected_objects = {
    "person" : False,
    "cell phone": False,
    }
    person_count = 0

    for box in result.boxes:
        label = yolo_model.names[int(box.cls[0])]
        
        if label == "person":
            detected_objects["person"]=True
            person_count += 1

        if label == "cell phone":
            detected_objects["cell phone"] = True

    return person_count, detected_objects

def authenticate_face(image: np.ndarray, name: str) -> bool:
    with open(face_data_path, "r") as f:
        try:
            data = json.load(f)
            if isinstance(data, dict):
                data = [data]
        except json.JSONDecodeError:
            print("❌ Corrupted JSON data.")
            return False

    target_entry = next((entry for entry in data if entry["name"] == name), None)
    if not target_entry:
        print(f"❌ No entry found for name: {name}")
        return False

    known_encoding = np.array(target_entry["encoding"])
    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)

    for face_encoding in face_encodings:
        match = face_recognition.compare_faces([known_encoding], face_encoding)
        if match[0]:
            return True

    return False

def detect_head_direction(img: np.ndarray) -> str:
    res = face_mesh.process(img)
    h, w, c = img.shape

    if res.multi_face_landmarks:
        face_3d = []
        face_2d = []
        facelm = res.multi_face_landmarks[0]

        for idx, lm in enumerate(facelm.landmark):
            if idx in [33, 263, 1, 61, 291, 199]:
                x, y = int(lm.x * w), int(lm.y * h)
                face_2d.append([x, y])
                face_3d.append([x, y, lm.z])

        face_2d = np.array(face_2d, dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)

        focal_length = w
        cam_matrix = np.array([[focal_length, 0, h / 2],
                               [0, focal_length, w / 2],
                               [0, 0, 1]])
        dis_matrix = np.zeros((4, 1), dtype=np.float64)

        success, rot_vec, trans_vec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dis_matrix)
        rmat, _ = cv2.Rodrigues(rot_vec)
        angles, *_ = cv2.RQDecomp3x3(rmat)

        x, y = angles[0] * 360, angles[1] * 360

        if y < -25:
            return "Right"
        elif y > 25:
            return "Left"
        elif x < -25:
            return "Down"
        elif x > 25:
            return "Up"
        else:
            return "Forward"

    return "Error"

def setup_drag_camera_handler(sio):
    @sio.on("drag_camera")
    def handle_drag_camera(data):
        global last_yolo_process, auth_status, head_position
        global detected_objects, person_count, processing_yolo
        global last_head_process, last_auth_process

        buffer = data["buffer"]
        metadata = data["metadata"]
        # name = data["name"]
        name = "sriram"
        img = decode_image(buffer)
        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        now = time.time()

        if now - last_auth_process > AUTH_INTERVAL:
            with auth_lock:
                if now - last_auth_process > AUTH_INTERVAL:
                    auth_status = authenticate_face(rgb_img, name)
                    last_auth_process = now

        if now - last_head_process > HEAD_INTERVAL:
            with head_lock:
                if now - last_head_process > HEAD_INTERVAL:
                    head_position = detect_head_direction(rgb_img)
                    last_head_process = now

        if not processing_yolo and (now - last_yolo_process > 0.5):
            person_count, detected_objects = detect_person_and_objects(rgb_img)
            last_yolo_process = now

        print(f"Detected {person_count} persons and objects: {detected_objects}")
        sio.emit("drag_camera_result", {
            "no_of_person": person_count,
            "auth_face": auth_status,
            "head_position": head_position,
            "object_detected": detected_objects,
        })