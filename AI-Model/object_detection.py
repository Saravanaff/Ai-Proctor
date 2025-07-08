from ultralytics import YOLO
import cv2
import time

# Load YOLOv8n model (pretrained on COCO)
model = YOLO('yolov8n.pt')  # You can use yolov8s.pt for better accuracy

# Open webcam
cap = cv2.VideoCapture(0)

# Set webcam properties for better performance
cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
cap.set(cv2.CAP_PROP_FPS, 30)

# List of target classes
TARGET_CLASSES = ['person', 'cell phone', 'headphones']

# Performance optimization variables
frame_count = 0
detection_interval = 10  # Run detection every 10 frames for better performance
last_detections = []

while True:
    ret, frame = cap.read()
    if not ret:
        break

    frame_count += 1
    
    # Only run detection every N frames to improve performance
    if frame_count % detection_interval == 0:
        # Run detection on original frame with optimized settings
        results = model.predict(
            source=frame, 
            conf=0.5,           # Higher confidence threshold
            iou=0.7,            # Higher IoU threshold to reduce overlapping boxes
            verbose=False,
            device='cpu',       # Explicitly use CPU
            half=False,         # Disable half precision for CPU
            max_det=10          # Limit max detections per image
        )
        
        # Clear previous detections
        last_detections = []
        
        # Process results
        for r in results:
            if r.boxes is not None:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    class_name = model.names[cls_id]
                    if class_name in TARGET_CLASSES:
                        # Get coordinates directly (no scaling needed)
                        xyxy = box.xyxy[0].cpu().numpy()
                        
                        x1 = int(xyxy[0])
                        y1 = int(xyxy[1])
                        x2 = int(xyxy[2])
                        y2 = int(xyxy[3])
                        
                        conf = box.conf[0].item()
                        last_detections.append((x1, y1, x2, y2, class_name, conf))
    
    # Draw bounding boxes from last detections
    for detection in last_detections:
        x1, y1, x2, y2, class_name, conf = detection
        label = f"{class_name} {conf:.2f}"
        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
        cv2.putText(frame, label, (x1, y1-10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 0, 255), 2)

    cv2.imshow("YOLOv8 Detection - AI Proctor", frame)
    if cv2.waitKey(1) == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
