// src/workers/inference.worker.ts
import {
  FaceLandmarker,
  ObjectDetector,
  NormalizedLandmark,
  ObjectDetectorResult,
  Detection,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Category
} from "@mediapipe/tasks-vision";
import {
  getFaceLandmarkerInstance,
  getObjectDetectorInstance,
  closeModels,
} from "@/lib/modelManager";

// --- Utility functions copied from src/utils/aiModel ---

function headPos(landmarks: NormalizedLandmark[][]) {
    if (!landmarks || landmarks.length === 0 || landmarks[0].length < 468) return "unknown";
    const leftNose = landmarks[0][49];
    const rightNose = landmarks[0][279];
    const noseTip = landmarks[0][1];

    const midpoint = {
        x: ((leftNose?.x ?? 0) + (rightNose?.x ?? 0)) / 2,
        y: ((leftNose?.y ?? 0) + (rightNose?.y ?? 0)) / 2,
        z: ((leftNose?.z ?? 0) + (rightNose?.z ?? 0)) / 2,
    };

    const perpendicularUp = { x: midpoint.x, y: midpoint.y - 50, z: midpoint.z };

    const yaw = getAngleBetweenLines(midpoint, noseTip, perpendicularUp);
    const turn = getAngleBetweenLines(midpoint, rightNose, noseTip);

    const direction = ""; // Initialize with empty string
    if (turn < 50) direction = "left";
    else if (turn > 120) direction = "right";
    else if (yaw < 100) direction = "up";
    else if (yaw > 178) direction = "down";
    else direction = "forward";

    return direction;

}

function getAngleBetweenLines(midpoint: { x: number; y: number; z: number; }, point1: { x: number; y: number; z: number; }, point2: { x: number; y: number; z: number; }) {
    const vector1 = { x: point1.x - midpoint.x, y: point1.y - midpoint.y };
    const vector2 = { x: point2.x - midpoint.x, y: point2.y - midpoint.y };

    const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;

    const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    const cosineTheta = dotProduct / (magnitude1 * magnitude2);
    const angleInRadians = Math.acos(cosineTheta);
    const angleInDegrees = (angleInRadians * 180) / Math.PI;

    return angleInDegrees;
}

function eye_direction(p1: NormalizedLandmark, p2: NormalizedLandmark, p3: NormalizedLandmark, p4: NormalizedLandmark, eye: string, width: number, height: number) {
    let gaze_direction = "unknown";
    const o_cor = get_landmarks(p1, width, height);
    const i_cor = get_landmarks(p2, width, height);
    const iris_left = get_landmarks(p3, width, height);
    const iris_right = get_landmarks(p4, width, height);

    const eye_width = o_cor.norm - i_cor.norm;
    const iris_center = (iris_right.norm + iris_left.norm) / 2;
    const iris_ratio = (iris_center - i_cor.norm) / eye_width

    if (eye == "right") {
        if (iris_ratio < 0.40) gaze_direction = "left";
        else if (iris_ratio > 0.60) gaze_direction = "right";
        else gaze_direction = "center";
    }
    else {
        if (iris_ratio < 0.40) gaze_direction = "right";
        else if (iris_ratio > 0.60) gaze_direction = "left";
        else gaze_direction = "center";
    }
    return gaze_direction;
}

function get_landmarks(points: NormalizedLandmark, w: number, h: number) {
    const width = w || 640;
    const height = h || 480;
    const marking = {
        x: points.x * width,
        y: points.y * height,
        norm: points.x
    };
    return marking;
}

function detector(result: ObjectDetectorResult) {
    let phone = 0;
    let person = 0;

    if (result && result.detections && result.detections.length > 0) {
        result.detections.forEach((det: Detection) => {
            const category = det.categories?.[0];
            if (!category) return;

            const name = category.categoryName;

            if (name == "person") person++;
            else if (name == "cell phone") phone++;
        })
    }

    return { person, phone };
}


// --- Worker Logic ---

let faceLandmarker: FaceLandmarker | null = null;
let objectDetector: ObjectDetector | null = null;

self.onmessage = async (event) => {
  const { type, payload } = event.data;

  if (type === 'init') {
    const { examSettings } = payload;
    const shouldLoadFaceLandmarker = examSettings?.head_direction_enabled || examSettings?.eyeball_detection_enabled;
    const shouldLoadObjectDetector = examSettings?.object_detection_enabled || examSettings?.multiple_person_detection_enabled;

    if(shouldLoadFaceLandmarker) {
        faceLandmarker = await getFaceLandmarkerInstance();
    }
    if(shouldLoadObjectDetector) {
        objectDetector = await getObjectDetectorInstance();
    }

    self.postMessage({ type: 'initialized' });
  } else if (type === 'detect') {
    const { imageBitmap } = payload;
    if (!faceLandmarker && !objectDetector) {
        return;
    }
    
    const detections = {
        head: 'unknown',
        gaze: 'unknown',
        objects: { person: 0, phone: 0 },
    };

    const startTimeMs = performance.now();

    if(faceLandmarker) {
        const faceResult = faceLandmarker.detectForVideo(imageBitmap, startTimeMs);
        if (faceResult.faceLandmarks && faceResult.faceLandmarks.length > 0) {
            const landmarks = faceResult.faceLandmarks;
            detections.head = headPos(landmarks);

            const r_eye_direction = eye_direction(landmarks[0][163],landmarks[0][157],landmarks[0][471],landmarks[0][469],"right", imageBitmap.width, imageBitmap.height);
            const l_eye_direction = eye_direction(landmarks[0][390], landmarks[0][384], landmarks[0][474], landmarks[0][476], "left", imageBitmap.width, imageBitmap.height);

            if (r_eye_direction == "left" && l_eye_direction == "left") {
                detections.gaze = "left";
            } else if (r_eye_direction == "right" && l_eye_direction == "right") {
                detections.gaze = "right";
            } else {
                detections.gaze = "center";
            }
        }
    }

    if(objectDetector) {
        const objectResult = objectDetector.detectForVideo(imageBitmap, startTimeMs);
        detections.objects = detector(objectResult);
    }
    
    self.postMessage({ type: 'detectionResult', payload: detections });

    // Close the bitmap to free memory
    imageBitmap.close();

  } else if (type === 'close') {
    closeModels();
  }
};

export {};