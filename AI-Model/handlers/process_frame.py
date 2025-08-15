import numpy as np
import cv2
import face_recognition
import time
from core import constants,image_utils,head_pose,store_face
import gc

stage_arr=["Forward","Up","Right","Down","Left"]
is_store=False

last_processed_time = 0
frame_count = 0  

def is_face_in_circle_optimized(face_coords, circle_center, circle_radius):
    
    top, right, bottom, left = face_coords
    face_center_x = (left + right) * 0.5  
    face_center_y = (top + bottom) * 0.5
    
   
    dx = face_center_x - circle_center[0]
    dy = face_center_y - circle_center[1]
    distance_squared = dx * dx + dy * dy
    radius_squared = circle_radius * circle_radius
    
    max_distance_squared = (circle_radius * CIRCLE_CENTER_THRESHOLD) ** 2
    if distance_squared > max_distance_squared:
        return False
    
    face_width = right - left
    face_height = bottom - top
    face_area = face_width * face_height
    circle_area = PI_APPROX * radius_squared
    size_ratio = face_area / circle_area
    
    if not (FACE_SIZE_RATIO_MIN <= size_ratio <= FACE_SIZE_RATIO_MAX):
        return False
    
    corners_in_circle = 0
    corners = [(left, top), (right, top), (left, bottom), (right, bottom)]
    
    for corner_x, corner_y in corners:
        corner_dx = corner_x - circle_center[0]
        corner_dy = corner_y - circle_center[1]
        if (corner_dx * corner_dx + corner_dy * corner_dy) <= radius_squared:
            corners_in_circle += 1
            if corners_in_circle >= 2:  
                break
    
    is_centered = distance_squared <= max_distance_squared
    has_good_coverage = corners_in_circle >= 2 or distance_squared <= (circle_radius * CIRCLE_COVERAGE_THRESHOLD) ** 2
    
    return is_centered and has_good_coverage

def setup_process_frame_handler(sio):
    @sio.on("process-frame")
    def handle_frame(data):
        global last_processed_time
        global is_store
        global frame_count
        frame_count += 1
        
        if frame_count % FACE_DETECTION_INTERVAL != 0:
            return
            
        current_time = time.time()
        if current_time - last_processed_time < FRAME_INTERVAL:
            return

        try:
            last_processed_time = current_time

            userId = data["user_id"]
            buffer = data["buffer"]
            metadata = data["metadata"]
            width, height = int(metadata["width"]), int(metadata["height"])
            
            circle_center = (width * 0.5, height * 0.5)  
            circle_radius = min(width, height) * 0.4  

            image_array = np.frombuffer(buffer, dtype=np.uint8)
            img = cv2.imdecode(image_array, cv2.IMREAD_COLOR)

            if img is None:
                return
            
            if is_store==False:
                cv2.imwrite("test_image.jpg",img)
                print("Saved test data")
                is_store=True

            small_img = cv2.resize(img, (0, 0), fx=0.5, fy=0.5)
            rgb_small = cv2.cvtColor(small_img, cv2.COLOR_BGR2RGB)
            print("rgb_small shape: " ,rgb_small.shape," dtype : ",rgb_small.dtype)
            faces_fr = face_recognition.face_locations(rgb_small)

            
            face_in_circle = False
            if fr_faces_scaled:
                
                face_in_circle = is_face_in_circle_optimized(fr_faces_scaled[0], circle_center, circle_radius)

            
            if face_in_circle and (current_time - constants.last_head_process > constants.HEAD_INTERVAL):
                with constants.head_lock:
                    if current_time - constants.last_head_process > constants.HEAD_INTERVAL:
                        constants.head_position, constants.eyes = head_pose.detect_head_direction(rgb_small)
                        constants.last_head_process = last_processed_time

            if stage_arr[constants.stage] == constants.head_position: 
                if(len(faces_fr)>0):
                    constants.counter[constants.stage]+=1
            else:
                constants.counter[constants.stage]=0

            if constants.counter[constants.stage]%10==0 and constants.counter[constants.stage]!=0:
                if constants.head_position == stage_arr[constants.stage] and len(faces_fr) >0 :
                    print("store called")
                    if(store_face.store_data(rgb_small,faces_fr,constants.stage,userId)):
                        constants.success[constants.stage]=True
                    else: 
                        print("Failure")
                    print("store exit")

            result_data = {
                "userId":userId,
                "face_found": len(faces_fr) > 0,
                "head_position": constants.head_position,
                "stage":constants.stage,
                "counter":constants.counter[constants.stage],
                "success":constants.success[constants.stage],

            }
            if constants.success[constants.stage]:
                constants.stage+=1

            sio.emit("result", result_data)

            del image_array, img, small_img, rgb_small, faces_fr, fr_faces_scaled
            gc.collect()

        except Exception as e:
            print(f"🚨 Error: {e}")
            gc.collect()