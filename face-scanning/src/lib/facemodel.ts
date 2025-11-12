import * as faceapi from "face-api.js";

let facesloaded = false;

export async function loadFaceModel() {
    if (facesloaded) {
        console.log('Face model already loaded - reusing cache');
        return faceapi;
    }

    const MODEL_URL = "/models";
    console.log('Loading face-api.js models...');

    await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
    ]);


    facesloaded = true;
    console.log('face-api.js models loaded successfully');
    return faceapi;
}