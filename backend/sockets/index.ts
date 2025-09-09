import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  getRtpCapabilities,
  createTransport,
  connectTransport,
  produce,
} from "../mediasoupServer";
import dotenv from 'dotenv';
import path from 'path';
import { io as ioClient } from "socket.io-client";
import { getExamScore, addScore, calculateExamScore } from "../utils/calculate";

dotenv.config({ path: path.join(__dirname, ".env") });

const storageServerUrl = process.env.STORAGE_SERVER_URL;

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: { origin: "*" },
  });

  const userToSocket = new Map<string, string>();
  const socketToUser = new Map<string, string>();
  const isCapture = new Set<string>();
  const modelSocket = new Map<string, string>(); 
  const socketToModel = new Map<string, string>();
  const authCounter = new Map<string, number>(); 
  const frameCounter = new Map<string, number>(); 
  const authVerified = new Map<string, boolean>();
  function linkSocketToUser(socketId: string, userId?: string | null) {
    if (!userId) return;
    const uid = String(userId);
    const prev = userToSocket.get(uid);
    if (prev && prev !== socketId) socketToUser.delete(prev);
    userToSocket.set(uid, socketId);
    socketToUser.set(socketId, uid);
  }

  function unlinkSocket(socketId: string) {
    const uid = socketToUser.get(socketId);
    if (!uid) return;
    socketToUser.delete(socketId);
    const active = userToSocket.get(uid);
    if (active === socketId) userToSocket.delete(uid);
    isCapture.delete(uid);
    authCounter.delete(uid);
    frameCounter.delete(uid);
    authVerified.delete(uid);
  }

  function emitToUserById(userId: string | undefined, event: string, payload: any) {
    if (!userId) return;
    const sid = userToSocket.get(String(userId));
    if (!sid) return;
    io.to(sid).emit(event, payload);
  }

  function resolveUserId(socket: any): string | null {
    const fromAuth = socket?.handshake?.auth?.userId;
    return fromAuth != null ? String(fromAuth) : null;
  }

  function emitToModel(modelId: string | undefined, event: string, payload: any) {
    if (!modelId) return;
    const sid = modelSocket.get(String(modelId));
    if (!sid) return;
    io.to(sid).emit(event, payload);
  }

  function emitToAllModels(event: string, payload: any) {
    for (const sid of modelSocket.values()) {
      io.to(sid).emit(event, payload);
    }
  }

  let proxy: any = null;
  let storageSocket: any = ioClient(`http://localhost:${3003}`);

  io.on("connection", (socket) => {
    const uid = resolveUserId(socket);
    linkSocketToUser(socket.id, uid);

    socket.on("getRtpCapabilities", (cb) => {
      cb({ rtpCapabilities: getRtpCapabilities() });
    });

    socket.on("createWebRtcTransport", async ({ direction }, cb) => {
      const transportOptions = await createTransport();
      cb(transportOptions);
    });

    socket.on("connectTransport", async ({ transportId, dtlsParameters }, cb) => {
      await connectTransport(transportId, dtlsParameters);
      cb();
    });

    socket.on("produce", async ({ transportId, kind, rtpParameters }, cb) => {
      const id = await produce(transportId, kind, rtpParameters);
      cb({ id });
    });

    socket.on("register-python", (payload: any) => {
      const modelId = String(payload?.service ?? "");
      if (!modelId) return;

      modelSocket.set(modelId, socket.id);
      socketToModel.set(socket.id, modelId);
      console.log(modelId,socket.id);

      socket.removeAllListeners("thirdeye_cam_result");
      socket.removeAllListeners("face_data_saved");
      socket.removeAllListeners("drag_camera_result");
      socket.removeAllListeners("result");

      socket.on("thirdeye_cam_result", (data: any) => {
        addScore(data);
        if (proxy) {
          proxy.emit("thirdeye_alert", data);
        }
      });

      socket.on("face_data_saved", (data: any) => {
        const uid = String(data?.userId ?? data?.user_id ?? "");
        if (uid) isCapture.delete(uid);
        console.log("face_data_saved");
        emitToUserById(uid || data?.userId, "face_save_status", data);
      });
 
      socket.on("mobileDetectRes", (data: any) => {
        addScore(data);
        emitToUserById(data?.userId, "mobileDetectRes-client", data);
      });

      socket.on("result", (data: any) => {
        emitToUserById(data?.userId, "fres", data);
      });
    });

    socket.on("faceAuthRes",(data)=>{
      const uid = String(data?.userId);
      if (data?.auth === true) {
        authVerified.set(uid, true);
      } else {
        authVerified.set(uid, false); 
      }
        addScore({
          userId: data?.userId,
          examId: data?.examId,
          auth_face: data?.auth
        });
      console.log("auth");

      emitToUserById(data?.userId,"faceAuthRes-client",data);
    });

    socket.on("headPositionRes",(data)=>{
      console.log(data);
        addScore({
          userId: data?.userId,
          examId: data?.examId,
          head_position: data?.data?.headPos
        });
      emitToUserById(data?.userId,"headPositionRes-client",data);
    });

    socket.on("eyePositionRes",(data)=>{
        const left = data?.data?.leftEye;
        const right = data?.data?.rightEye;
        console.log(left,right,"hi");
        console.log(data);
        addScore({
          userId: data?.userId,
          examId: data?.examId,
          eyes: [left, right].filter(Boolean)
        });
      emitToUserById(data?.userId,"eyePositionRes-client",data);
    });

    socket.on("webDetectRes",(data)=>{
      try {
        addScore({
          userId: data?.userId,
          examId: data?.examId,
          object_detected: { "cell phone": (data?.data?.["Mobile-phone"]||0) > 0 },
          no_of_person: data?.data?.Person
        });
      } catch {}
      emitToUserById(data?.userId,"webDetectRes-client",data);
    })
    

    socket.on("proxy", () => {
      proxy = socket;
      console.log("Proxy is connected...");

      if (proxy) {
        proxy.on("videos", (data: any) => {
          emitToModel("thirdeye_detect", "mobileDetect", data);
        });
        proxy.on("recorder-add-video-stream-chunk", (data: any) => {
          // console.log("chunk ,",data.chunk);
          if (storageSocket) {
            storageSocket.emit("add-video-stream-chunk", data);
          }
        });
        proxy.on("start-exam", (data: any) => {
          if (storageSocket) {
            // console.log("Exam started", data);
            storageSocket.emit("start-stream-recording", data);
          }
        });
        proxy.on("end-exam", (data: any) => {
          if (storageSocket) {
            storageSocket.emit("stop-stream-recording", data);
          }
        });
      }
    });

    socket.on("photo-save", (data) => {
      console.log("sending data",data);
      emitToModel("face_service","faceStore",data);
    });

    socket.on("authenticate", (data) => {
      const uidKey = String((data as any)?.userId);
      const verified = authVerified.get(uidKey) === true;

      emitToModel("web_detect", "webDetect", data);
      const settings = (data as any)?.examSettings ?? (data as any)?.settings;
      if (settings) {
        if (settings.eyeball_detection_enabled){
          emitToModel("eye_position", "eyePosition", data);
        }
        if (settings.head_direction_enabled) emitToModel("head_service", "headPosition", data);
      }

      if (!verified) {
        emitToModel("face_service", "faceAuth", data);
        authCounter.set(uidKey, 0); 
        return;
      }

      const count = (authCounter.get(uidKey) ?? 0) + 1;
      if (count % 5 === 0) {
        emitToModel("face_service", "faceAuth", data);
        authCounter.set(uidKey, 0);
      } else {
        authCounter.set(uidKey, count);
      }
    });

    socket.on("submit", async (data, cb) => {
      try {
        const { userId, examId } = data || {};
        const raw = getExamScore(userId, examId);
        if (!raw) {
          const failPayload = { success: false, message: "No score data found" };
          emitToUserById(userId, "exam_score", failPayload);
          if (typeof cb === 'function') cb(failPayload);
          return;
        }
        const computed = await calculateExamScore(raw);
        const payload = { success: true, score: computed };
        emitToUserById(userId, "exam_score", payload);
        if (typeof cb === 'function') cb(payload);
      } catch (err:any) {
        const errorPayload = { success: false, message: err?.message || 'Score calculation failed' };
        if (data?.userId) emitToUserById(data.userId, "exam_score", errorPayload);
        if (typeof cb === 'function') cb(errorPayload);
      }
    });

    socket.on("frame", (data) => {
      // console.log("framing");
      emitToModel("face_service","process-frame",data);
    });

    socket.on("recorder-add-video-stream-chunk", (data: any) => {
      
      if (storageSocket) {
        storageSocket.emit("add-video-stream-chunk", data);
      }
    });

    socket.on("start-exam", (data: any) => {
      if (storageSocket) {
        // console.log("Exam started", data);
        storageSocket.emit("start-stream-recording", data);
      }
    });
    socket.on("end-exam", (data: any) => {
      if (storageSocket) {
        /* For Closing Video Recording */

        // const fileName = path.join(__dirname, "logs", "log.csv");
        // const score = calculateScoreOnUser(fileName);
        storageSocket.emit("stop-stream-recording", data);
      }
    });

    socket.on("register-third-eye-setup", (data: any) => {
      const { userId } = data;
      console.log(`Third eye setup registered for user: ${userId}`);
    });
    socket.on("mobile-acknowledgment", () => {
          console.log("Mobile device connected - sending acknowledgment");
          socket.broadcast.emit("mobile-connected", { status: true, timestamp: new Date() });
    });


    socket.on("disconnect", () => {
      unlinkSocket(socket.id);
      const modelId = socketToModel.get(socket.id);
      if (modelId) modelSocket.delete(modelId);
      socketToModel.delete(socket.id);
    });
  });

  return io;
}
