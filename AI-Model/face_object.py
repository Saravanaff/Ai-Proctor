import cv2
from ultralytics import YOLO
import mediapipe as mp

TARGET_CLASSES = ['person', 'cell phone', 'headphones']
drawing_spec = mp.solutions.drawing_utils.DrawingSpec(thickness=1, circle_radius=1)

frame_count = 0
face_detection_interval = 5 
object_detection_interval = 10
last_object_detections = []

def initialize_models():
    """Initialize YOLO and MediaPipe models."""
    yolo_model = YOLO('yolov8n.pt') 
    face_mesh = mp.solutions.face_mesh.FaceMesh(
        static_image_mode=False,
        max_num_faces=2,
        refine_landmarks=False,
        min_detection_confidence=0.6,
        min_tracking_confidence=0.6
    )
    return yolo_model, face_mesh

def detect_faces(frame, face_mesh, should_run=True):
    """Run MediaPipe FaceMesh on the given frame and draw landmarks."""
    if not should_run:
        return frame
        
    try:
        mp_drawing = mp.solutions.drawing_utils
        mp_drawing_styles = mp.solutions.drawing_styles
        mp_face_mesh = mp.solutions.face_mesh
        
        image_rgb = cv2.cvtColor(frame.copy(), cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False
        results = face_mesh.process(image_rgb)
        
        if results.multi_face_landmarks:
            for face_landmarks in results.multi_face_landmarks:
                mp_drawing.draw_landmarks(
                    image=frame,
                    landmark_list=face_landmarks,
                    connections=mp_face_mesh.FACEMESH_CONTOURS,
                    landmark_drawing_spec=None,
                    connection_drawing_spec=mp_drawing_styles.get_default_face_mesh_contours_style()
                )
    except Exception as e:
        print(f"Face detection error: {e}")
        
    return frame

def detect_objects(frame, yolo_model, should_run=True):
    """Run YOLOv8 on the given frame and draw bounding boxes for target classes."""
    global last_object_detections
    
    if should_run:
        last_object_detections = []
        
        results = yolo_model.predict(
            source=frame, 
            conf=0.5,           # Higher confidence threshold
            iou=0.7,            # Higher IoU threshold
            verbose=False,
            device='cpu',       # Explicitly use CPU
            half=False,         # Disable half precision for CPU
            max_det=8           # Limit max detections per image
        )
        
        # Process results and store for reuse
        for r in results:
            if r.boxes is not None:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    class_name = yolo_model.names[cls_id]
                    if class_name in TARGET_CLASSES:
                        xyxy = box.xyxy[0].cpu().numpy().astype(int)
                        conf = box.conf[0].item()
                        last_object_detections.append((xyxy, class_name, conf))
    
    for detection in last_object_detections:
        xyxy, class_name, conf = detection
        label = f"{class_name} {conf:.2f}"
        cv2.rectangle(frame, tuple(xyxy[:2]), tuple(xyxy[2:]), (0, 255, 0), 2)
        cv2.putText(frame, label, tuple(xyxy[:2]), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)
    
    return frame

def main():
    """Main loop to run webcam feed with FaceMesh and YOLOv8 detection."""
    global frame_count
    
    yolo_model, face_mesh = initialize_models()
    cap = cv2.VideoCapture(0)
    
    # Set webcam properties for better performance
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        frame_count += 1
        
        should_run_face = (frame_count % face_detection_interval == 0)
        frame = detect_faces(frame, face_mesh, should_run_face)
        
        should_run_object = (frame_count % object_detection_interval == 0)
        frame = detect_objects(frame, yolo_model, should_run_object)

        cv2.imshow("Combined Proctoring - FaceMesh + YOLOv8", frame)

        k = cv2.waitKey(1)
        if k == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()
    face_mesh.close()

if __name__ == "__main__":
    main()
