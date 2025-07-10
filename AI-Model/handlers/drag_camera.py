import numpy as np
import cv2
import face_recognition
import mediapipe as mp
# from ultralytics import YOLO
import json
import time

# Cooldown intervals (in seconds)
# HEAD_COOLDOWN = 2.0
# AUTH_COOLDOWN = 3.0

# # Last run timestamps
# last_head_time = 0
# last_auth_time = 0

#global result
auth_status=False
head_position="Forward"

# # ------------------ Model Initialization ------------------
# yolo_model = YOLO("yolov8n.pt")  # Lightweight model
mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(static_image_mode=True, refine_landmarks=True)

# # Load known face encodings
# with open("storage/face_data.json", "r") as f:
#     face_data = json.load(f)
#     known_faces = {entry["name"]: np.array(entry["encoding"]) for entry in face_data}
# # ----------------------------------------------------------


def decode_image(buffer: bytes) -> np.ndarray:
    np_data = np.frombuffer(bytes(buffer), dtype=np.uint8)
    image = cv2.imdecode(np_data, cv2.IMREAD_COLOR)
    return image


# def detect_person_and_objects(image: np.ndarray) -> tuple[int, list[str]]:
#     results = yolo_model.predict(image, conf=0.4, verbose=False)[0]
#     object_labels = []
#     person_count = 0

#     for box in results.boxes:
#         label = yolo_model.names[int(box.cls[0])]
#         object_labels.append(label)
#         if label == "person":
#             person_count += 1

#     return person_count, object_labels
face_data_path = "storage/face_data.json"

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
    known_name = target_entry["name"]

    face_locations = face_recognition.face_locations(image)
    face_encodings = face_recognition.face_encodings(image, face_locations)

    for face_encoding in face_encodings:
        match = face_recognition.compare_faces([known_encoding], face_encoding)
        if match[0]:
            return True

    return False


def detect_head_direction(img: np.ndarray) -> str:

    res= face_mesh.process(img)
    h, w, c = img.shape
    
    if res.multi_face_landmarks:
        face_3d=[]
        face_2d=[]
        facelm = res.multi_face_landmarks[0]
        for idx, lm in enumerate(facelm.landmark):
            if idx==33 or idx== 263 or idx==1 or idx==61 or idx==291 or idx ==199:
                
                x,y = int(lm.x * w),int(lm.y * h)

                face_2d.append([x,y])
                face_3d.append([x,y,lm.z])
        
        face_2d = np.array(face_2d,dtype=np.float64)
        face_3d = np.array(face_3d, dtype=np.float64)

        focal_length = 1*w

        cam_matrix = np.array([[focal_length,0,h/2],
                               [0,focal_length,w/2],
                               [0,0,1]
                               ])
        
        dis_matrix = np.zeros((4,1),dtype=np.float64)

        success, rot_vec, trans_vec = cv2.solvePnP(face_3d,face_2d,cam_matrix,dis_matrix)

        rmat, jac = cv2.Rodrigues(rot_vec)

        angles, mtxR, mtxQ, Qx, Qy, Qz= cv2.RQDecomp3x3(rmat)

        x = angles[0]*360
        y = angles[1]*360
        z = angles[2]*360

        if y < -10:
            text = "Right"
        elif y > 10:
            text = "Left"
        elif x < -10:
            text = "Down"
        elif x > 10:
            text = "Up"
        else:
            text = "Forward"
    
        return text
    
    return "Error"


def setup_drag_camera_handler(sio):
    @sio.on("drag_camera")
    def handle_drag_camera(data):
        global last_head_time, last_auth_time, auth_status, head_position
        buffer = data["buffer"]
        metadata= data["metadata"]
        name = data["name"]
        img = decode_image(buffer)

        rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

        now=time.time()

        # if now - last_head_time > HEAD_COOLDOWN:
        head_position = detect_head_direction(rgb_img)
            # last_head_time = now

        # if now - last_auth_time > AUTH_COOLDOWN:
        #     auth_status = authenticate_face(rgb_img, name)
        #     last_auth_time = now

        # Emit results
        sio.emit("drag_camera", {
            # "no_of_person": person_count,
            # "auth_face": auth_status,
            "head_position": head_position,
            # "object_detected": object_array
        })

