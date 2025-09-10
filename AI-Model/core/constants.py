from threading import Lock
import queue

auth_status = False
head_position = "Forward"
frame_count = 0

detected_objects = {
    "Person": 0,
    "Mobile-phone": 0,
    "Laptop": 0,
}


third_eye_objects = {
    "Person": 0,
    "Laptop": 0,
    "Mobile-phone": 0,
}



person_count = 1
faces_scaled=[]

eyes = ["center", "center"]

last_yolo_process = 0
last_head_process = 0
last_auth_process = 0
last_processed_time = 0
last_cam_process = 0
frameCount=0

AUTH_INTERVAL = 0.5
HEAD_INTERVAL = 0

yolo_lock = Lock()
auth_lock = Lock()
head_lock = Lock()
store_lock = Lock()
mobile_lock = Lock()

processing_yolo = False
processing_cam = False

face_data_path = "storage/face_data.json"

eyes_queue = queue.Queue()
head_queue = queue.Queue()
webdetect_queue = queue.Queue()
auth_queue = queue.Queue()
mobile_queue = queue.Queue()