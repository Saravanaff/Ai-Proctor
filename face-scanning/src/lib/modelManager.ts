import {
  FilesetResolver,
  FaceLandmarker,
  ObjectDetector,
} from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let objectDetector: ObjectDetector | null = null;
let vision: FilesetResolver | null = null;

const createVision = async () => {
  if (vision) return vision;
  vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
  );
  return vision;
};

export const getFaceLandmarkerInstance = async () => {
  if (faceLandmarker) return faceLandmarker;

  const vision = await createVision();
  faceLandmarker = await FaceLandmarker.createFromOptions(vision as any, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
      delegate: "GPU",
    },
    runningMode: "VIDEO",
    numFaces: 1,
    minFaceDetectionConfidence: 0.5,
    minFacePresenceConfidence: 0.5,
    minTrackingConfidence: 0.5,
    outputFaceBlendshapes: false,
    outputFacialTransformationMatrixes: false,
  });
  console.log("✅ MediaPipe Face Landmarker initialized (Singleton)");
  return faceLandmarker;
};

export const getObjectDetectorInstance = async () => {
  if (objectDetector) return objectDetector;

  const vision = await createVision();
  objectDetector = await ObjectDetector.createFromOptions(vision as any, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite`,
    },
    scoreThreshold: 0.4,
    runningMode: "VIDEO",
    maxResults: 10,
  });
  console.log("✅ MediaPipe Object Detector initialized (Singleton)");
  return objectDetector;
};

export const closeModels = () => {
    if (faceLandmarker) {
        faceLandmarker.close();
        faceLandmarker = null;
        console.log("Face Landmarker cleaned up (Singleton)");
    }
    if (objectDetector) {
        objectDetector.close();
        objectDetector = null;
        console.log("Object Detector cleaned up (Singleton)");
    }
    vision = null;
}