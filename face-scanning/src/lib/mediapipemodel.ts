import { FilesetResolver, FaceLandmarker, ObjectDetector } from "@mediapipe/tasks-vision";

let faceLandmarker: FaceLandmarker | null = null;
let objectDetector: ObjectDetector | null = null;
let meshLoaded = false;

export async function loadMeshModel() {
    if (meshLoaded && faceLandmarker && objectDetector) {
        console.log("Mediapipe models already loaded - reuse cache");
        return { faceLandmarker, objectDetector };
    }
    console.log("Initializing Mediapipe models..");
    const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
    );

    faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
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
    });

    objectDetector = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath:
                "https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite2/float16/1/efficientdet_lite2.tflite",
            delegate: "GPU",
        },
        scoreThreshold: 0.1,
        runningMode: "VIDEO",
    });
    meshLoaded = true;
    return { faceLandmarker, objectDetector };
}
