import { Server as SocketIOServer } from 'socket.io';

const modelSocket = new Map<string, string>();
const socketToModel = new Map<string, string>();
const authCounter = new Map<string, number>();
const authVerified = new Map<string, boolean>();

let ioInstance: SocketIOServer;
let addScoreFunc: Function;

export function initAIModelHandlers(io: SocketIOServer, addScore: Function) {
  ioInstance = io;
  addScoreFunc = addScore;
}

export function emitToModel(modelId: string | undefined, event: string, payload: any) {
  if (!modelId) return;
  const sid = modelSocket.get(String(modelId));
  if (!sid) return;
  ioInstance.to(sid).emit(event, payload);
}

export function emitToAllModels(event: string, payload: any) {
  for (const sid of modelSocket.values()) {
    ioInstance.to(sid).emit(event, payload);
  }
}

export function processFrameForAIModels(data: any, examSettings: any) {
  const uidKey = String(data.userId);
  const verified = authVerified.get(uidKey) === true;
  
  if (examSettings && examSettings.face_authentication_enabled) {
    if (!verified) {
      emitToModel("auth_service", "faceAuth", data);
      authCounter.set(uidKey, 0);
    } else {
      const count = (authCounter.get(uidKey) ?? 0) + 1;
      if (count % 50 === 0) {
        emitToModel("auth_service", "faceAuth", data);
        authCounter.set(uidKey, 0);
      } else {
        authCounter.set(uidKey, count);
      }
    }
  }
  
  if (examSettings) {
    if (examSettings.object_detection_enabled) {
      emitToModel("web_detect", "webDetect", data);
    }
    
    if (examSettings.eyeball_detection_enabled) {
      emitToModel("eye_position", "eyePosition", data);
    }
    
    if (examSettings.head_direction_enabled) {
      emitToModel("head_service", "headPosition", data);
    }
  }
}

export function registerPythonService(socketId: string, modelId: string) {
  modelSocket.set(modelId, socketId);
  socketToModel.set(socketId, modelId);
  console.log(`Python service registered: ${modelId} -> ${socketId}`);
}

export function handleFaceAuthResponse(data: any, emitToUserCallback: Function) {
  const uid = String(data?.userId);
  if (data?.auth === true) {
    authVerified.set(uid, true);
  } else {
    authVerified.set(uid, false);
  }
  
  addScoreFunc({
    userId: data?.userId,
    examId: data?.examId,
    auth_face: data?.auth,
    timestamp: data.timestamp
  });
  
  console.log("auth");
  emitToUserCallback(data?.userId, "faceAuthRes-client", data);
}

export function handleHeadPositionResponse(data: any, emitToUserCallback: Function) {
  console.log(data);
  addScoreFunc({
    userId: data?.userId,
    examId: data?.examId,
    head_position: data?.data?.headPos,
    timestamp: data.timestamp
  });
  emitToUserCallback(data?.userId, "headPositionRes-client", data);
}

export function handleEyePositionResponse(data: any, emitToUserCallback: Function) {
  const left = data?.data?.leftEye;
  const right = data?.data?.rightEye;
  
  console.log(left, right, "hi");
  console.log(data);
  addScoreFunc({
    userId: data?.userId,
    examId: data?.examId,
    eyes: [left, right].filter(Boolean),
    timestamp: data.timestamp
  });
  emitToUserCallback(data?.userId, "eyePositionRes-client", data);
}

export function handleWebDetectResponse(data: any, emitToUserCallback: Function) {
  console.log(data);
  addScoreFunc({
    userId: data?.userId,
    examId: data?.examId,
    object_detected: {
      "cell phone": Number(data?.data?.Mobile || 0) > 0,
    },
    no_of_person: data?.data?.Person,
    timestamp: data.timestamp
  });
  emitToUserCallback(data?.userId, "webDetectRes-client", data);
}

export function handleMobileDetectResponse(data: any, emitToUserCallback: Function) {
  addScoreFunc(data);
  emitToUserCallback(data?.userId, "mobileDetectRes-client", data);
}

export function handleThirdEyeCamResult(data: any, proxyEmit?: Function) {
  addScoreFunc(data);
  if (proxyEmit) {
    proxyEmit("thirdeye_alert", data);
  }
}

export function unregisterModel(socketId: string) {
  const modelId = socketToModel.get(socketId);
  if (modelId) {
    modelSocket.delete(modelId);
  }
  socketToModel.delete(socketId);
}

export function cleanupAIModel(userId: string) {
  authCounter.delete(userId);
  authVerified.delete(userId);
}

export function getModelSocket() {
  return modelSocket;
}

export function getSocketToModel() {
  return socketToModel;
}
