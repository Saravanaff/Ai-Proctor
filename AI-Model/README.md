# AI-Model - Computer Vision AI Proctor System

This project contains a collection of computer vision modules for an AI-based proctoring system. The modules use MediaPipe, OpenCV, and YOLO for real-time detection and tracking of various human behaviors and objects during online examinations.

## Features

- **Eye Movement Tracking** - Real-time iris tracking and gaze direction detection
- **Face Mesh Detection** - Detailed facial landmark detection and mesh visualization
- **Head Pose Estimation** - 3D head orientation tracking (looking left/right/up/down)
- **Hand Tracking** - Hand landmark detection and gesture recognition
- **Object Detection** - Detection of prohibited items (phones, headphones, etc.)
- **Pose Tracking** - Body posture monitoring
- **Modular Design** - Easy to integrate individual components

## System Requirements

- **Python Version**: 3.8 - 3.12 (Recommended: 3.12)
- **Operating System**: Windows, macOS, Linux
- **Camera**: Webcam or external camera
- **Hardware**: CPU (GPU optional for better performance)

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/Saravanaff/Ai-Proctor.git
   cd Ai-Proctor/AI-Model
   ```

2. **Create a virtual environment** (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies**:
   ```bash
   pip install -r requirements.txt
   ```

4. **Download YOLO model** (for object detection):
   The YOLOv8 model will be automatically downloaded when you first run `object_detection.py` or `face_object.py`.

## Usage

### Individual Modules

#### 1. Eye Movement Tracking
```bash
python eye_movement.py
```
- Tracks iris movement in real-time
- Displays direction of gaze (left, right, up, down, center)
- Press 'q' to quit

#### 2. Face Mesh Detection
```bash
python face_mesh.py
```
- Shows detailed facial landmarks and mesh
- Tracks up to 5 faces simultaneously
- Real-time face contour visualization

#### 3. Head Pose Estimation
```bash
python head_movement.py
```
- Estimates 3D head orientation
- Shows direction text (Looking Left/Right/Up/Down/Forward)
- Displays rotation angles (x, y, z)

#### 4. Hand Tracking
```bash
python hand_tracking.py
```
- Basic hand tracking with landmarks
- Highlights fingertip (landmark ID 8)
- Shows FPS counter

#### 5. Advanced Hand Tracking (Modular)
```bash
python HandTracker.py
```
- Uses the HandTrackingModule class
- More configurable parameters
- Better for integration into larger systems

#### 6. Object Detection
```bash
python object_detection.py
```
- Detects prohibited items: phones, headphones, additional persons
- Optimized for real-time performance
- Configurable detection intervals

#### 7. Combined Face and Object Detection
```bash
python face_object.py
```
- Combines face mesh and object detection
- Optimized performance with frame skipping
- Most comprehensive monitoring solution

#### 8. Pose Tracking
```bash
python pose_tracking.py
```
- Basic pose tracking setup
- Currently configured for video file input

### Integration Example

To use the HandTrackingModule in your own code:

```python
import cv2
import HandTrackingModule as htm

cap = cv2.VideoCapture(0)
detector = htm.handDetector(detectionCon=0.7, trackCon=0.7)

while True:
    success, img = cap.read()
    img = detector.findHands(img)
    lmList = detector.findPosition(img)
    
    if len(lmList) != 0:
        # Access landmark positions
        print(f"Thumb tip: {lmList[4]}")
    
    cv2.imshow("Hand Tracking", img)
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
```

## Configuration

### Camera Settings
Most scripts use camera index 0 by default. To change the camera:
```python
cap = cv2.VideoCapture(1)  # Change to your camera index
```

### Detection Sensitivity
Adjust confidence thresholds in the respective files:
- **MediaPipe**: `min_detection_confidence`, `min_tracking_confidence`
- **YOLO**: `conf` parameter in predict() method

### Performance Optimization
- Reduce frame size: `cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)`
- Increase detection intervals in `face_object.py`
- Disable refinement: `refine_landmarks=False`

## File Descriptions

- **`eye_movement.py`** - Iris tracking and gaze direction detection
- **`face_mesh.py`** - Facial landmark mesh visualization
- **`face_object.py`** - Combined face and object detection system
- **`hand_tracking.py`** - Basic hand landmark detection
- **`HandTracker.py`** - Advanced hand tracking using module
- **`HandTrackingModule.py`** - Reusable hand tracking class
- **`head_movement.py`** - 3D head pose estimation
- **`object_detection.py`** - YOLO-based object detection
- **`pose_tracking.py`** - Body pose tracking framework

## Troubleshooting

### Common Issues

1. **Camera not found**:
   - Check camera index (try 0, 1, 2...)
   - Ensure camera permissions are granted
   - Close other applications using the camera

2. **Low FPS**:
   - Reduce frame resolution
   - Increase detection intervals
   - Use CPU optimization flags

3. **Missing models**:
   - YOLOv8 models download automatically
   - Ensure internet connection for first run

4. **Import errors**:
   - Verify all dependencies are installed
   - Check Python version compatibility

### Performance Tips

- **CPU Optimization**: Use `device='cpu'` in YOLO predictions
- **Frame Skipping**: Process every Nth frame for better performance
- **Resolution**: Lower camera resolution for real-time performance
- **Detection Frequency**: Reduce detection intervals for smooth playback

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is part of the AI-Proctor system. Please refer to the main project license.

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review the code comments
3. Create an issue in the repository

---

**Note**: This system is designed for educational and proctoring purposes. Ensure compliance with privacy laws and regulations when deploying in production environments.