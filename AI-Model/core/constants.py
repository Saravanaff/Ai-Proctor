from threading import Lock

auth_status = False
head_position = "Forward"
frame_count = 0

detected_objects = {
    "person": False,
    "cell phone": False,
}

third_eye_objects = {
    "person": 0,
    "laptop": 0,
    "unauth_device": False,
}

person_count = 0

eyes = ["center", "center"]

last_yolo_process = 0
last_head_process = 0
last_auth_process = 0

AUTH_INTERVAL = 1.0
HEAD_INTERVAL = 0.5

yolo_lock = Lock()
auth_lock = Lock()
head_lock = Lock()

processing_yolo = False

face_data_path = "storage/face_data.json"
