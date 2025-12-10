import { Server as SocketIOServer, Socket } from 'socket.io';
import type { Server as HttpServer } from "http";
import dotenv from "dotenv";
import { io as ioClient } from "socket.io-client";
import { getExamScore, addScore, calculateExamScore } from "../utils/calculate";
import * as userSession from "./userSessionManager";
import * as aiModel from "./aiModelHandlers";
import * as examSession from "./examSessionManager";
import { processVideoChunk, cleanupVideoBuffers } from "./videoProcessor";

dotenv.config();

const storageServerUrl = process.env.STORAGE_SERVER_URL;

export function initSocket(server: HttpServer) {
  const io = new SocketIOServer(server, {
    transports: ["websocket"],
    cors: { origin: "*" },
  });

  aiModel.initAIModelHandlers(io, addScore);

  function emitToUserById(userId: string | undefined, event: string, payload: any) {
    if (!userId) return;
    const sid = userSession.getUserSocket(String(userId));
    if (!sid) return;
    io.to(sid).emit(event, payload);
  }

  const storageUrl = storageServerUrl || `https://localhost:3003`;
  console.log("🔗 Attempting to connect to storage server:", storageUrl);

  let storageSocket: any = ioClient(storageUrl, {
    rejectUnauthorized: false,
    transports: ["websocket", "polling"],
  });

  storageSocket.on("connect", () => {
    console.log("Connected to storage server");
  });

  storageSocket.on("disconnect", () => {
    console.log("Disconnected from storage server");
  });

  storageSocket.on("connect_error", (error: any) => {
    // console.log("🔥 Storage server connection error:", error.message);
  });

  io.on("connection", (socket: Socket) => {
    const uid = userSession.resolveUserId(socket);
    userSession.linkSocketToUser(socket.id, uid);

    socket.on("test", () => {
      console.log("test is connected");
    });
    socket.on("register-python", (payload: any) => {
      const modelId = String(payload?.service ?? "");
      if (!modelId) return;

      aiModel.registerPythonService(socket.id, modelId);
      console.log(modelId, socket.id);

      socket.removeAllListeners("thirdeye_cam_result");
      socket.removeAllListeners("face_data_saved");
      socket.removeAllListeners("drag_camera_result");
      socket.removeAllListeners("result");

      socket.on("thirdeye_cam_result", (data: any) => {
        aiModel.handleThirdEyeCamResult(data);
      });

      socket.on("face_data_saved", (data: any) => {
        const uid = String(data?.userId ?? data?.user_id ?? "");
        if (uid) userSession.setCapture(uid, false);
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

    socket.on("videos", (data: any) => {
      aiModel.emitToModel("thirdeye_detect", "mobileDetect", data);
    });
    socket.on("recorder-add-video-stream-chunk", (data: any) => {
      const userId = data?.user_id;
      const examId = data?.exam_id;
      const category = data?.category;
      const chunkSize = data?.chunk?.byteLength || 0;
      
      console.log(`📦 Received video chunk - User: ${userId}, Exam: ${examId}, Category: ${category}, Size: ${chunkSize} bytes`);
      
      // if (userId && examSettings) {
      //   processVideoChunk(data, userId, examSettings).catch(error => {
      //     console.error('Error processing video chunk for AI analysis:', error);
      //   });
      // }

      if (storageSocket && storageSocket.connected) {
        storageSocket.emit("add-video-stream-chunk", data);
        console.log(`✅ Relayed chunk to storage server for ${userId}_${examId}`);
      } else {
        console.warn("⚠️ Storage socket not connected - dropping video chunk");
      }
    });
    
    socket.on("start-exam", async(data: any) => {
      console.log("🎬 START-EXAM received from frontend:", {
        user_id: data.user_id,
        exam_id: data.exam_id,
        timestamp: data.timestamp
      });
      
      await examSession.handleExamStart(data);
    });

    socket.on("stream-listener-on",async(data)=>{
      console.log("📹 Emitting start-stream-recording to storage server:", {
        user_id: data.user_id,
        exam_id: data.exam_id,
        category: data.category
      });

      if(storageSocket && storageSocket.connected){
            storageSocket.emit("start-stream-recording", {
              user_id: data.user_id,
              exam_id: data.exam_id,
              category: data.category 
            });
            console.log("✅ start-stream-recording emitted to storage server");
          }
    });
    
    socket.on("end-exam", async(data: any) => {
      console.log("🛑 END-EXAM received from frontend:", {
        user_id: data.user_id,
        exam_id: data.exam_id,
        timestamp: data.timestamp
      });
      
      await examSession.handleExamEnd(data);
      
    });

    // ✅ Handle unexpected exam exits (browser close, refresh, navigation)
    socket.on("exam-unexpected-exit", async(data: any) => {
      console.log("🚪 EXAM-UNEXPECTED-EXIT received from frontend:", {
        user_id: data.user_id,
        exam_id: data.exam_id,
        exit_time: data.exit_time,
        timestamp: data.timestamp
      });
      
      // Call the unexpected-exit handler if exported; otherwise fallback to the end handler or warn.
      if ((examSession as any)?.handleExamUnexpectedExit) {
        await (examSession as any).handleExamUnexpectedExit(data);
      } else if (typeof (examSession as any)?.handleExamEnd === "function") {
        console.warn("handleExamUnexpectedExit not found; falling back to handleExamEnd");
        await (examSession as any).handleExamEnd(data);
      } else {
        console.warn("No handler available for exam unexpected exit:", data);
      }
    });

    socket.on("stream-listener-off",async(data)=>{
      console.log("⏹️ Received stream-listener-off from frontend:", {
        user_id: data.user_id,
        exam_id: data.exam_id,
        category: data.category,
        isFinal: data.isFinal,
        totalChunks: data.totalChunks
      });
      
      if (storageSocket && storageSocket.connected) {
        console.log("📤 Relaying stop-stream-recording to storage server");
        storageSocket.emit("stop-stream-recording", {
          user_id: data.user_id,
          exam_id: data.exam_id,
          category: data.category || 'face_camera',
          isFinal: data.isFinal,
          totalChunks: data.totalChunks
        });
        console.log("✅ stop-stream-recording relayed to storage server");
      } else {
        console.warn("⚠️ Storage socket not connected - cannot stop recording");
      }
    })

    socket.on("photo-save", (data: any) => {
      console.log(data);
      aiModel.emitToModel("face_service", "faceStore", data);
    });
    
    socket.on("authenticate", (data: any) => {
      const settings = (data as any)?.examSettings ?? (data as any)?.settings;
      aiModel.processFrameForAIModels(data, settings);
    });

    socket.on("submit", async (data: any, cb: Function) => {
      try {
        const { userId, examId } = data || {};
        const raw = getExamScore(userId, examId);
        if (!raw) {
          const failPayload = {
            success: false,
            message: "No score data found",
          };

          emitToUserById(userId, "exam_score", failPayload);
          if (typeof cb === "function") cb(failPayload);
          return;
        }
        const computed = await calculateExamScore(raw);
        
        const payload = { success: true, score: computed };
        emitToUserById(userId, "exam_score", payload);
        if (typeof cb === "function") cb(payload);
        
      } catch (err: any) {
        const errorPayload = {
          success: false,
          message: err?.message || "Score calculation failed",
        };
        if (data?.userId)
          emitToUserById(data.userId, "exam_score", errorPayload);
        if (typeof cb === "function") cb(errorPayload);
      }
    });

    socket.on("frame", (data: any) => {
      // console.log("framing");
      aiModel.emitToModel("store_service", "process-frame", data);
    });

    socket.on("register-third-eye-setup", (data: any) => {
      const { userId } = data;
      console.log(`Third eye setup registered for user: ${userId}`);
    });
  socket.on("mobile-acknowledgment", (data) => {
      const { userId } = data;
      console.log("Mobile device connected - sending acknowledgment");
      emitToUserById(userId, "mobile-connected", {
        status: true,
        timestamp: new Date(),
      });
    });

    socket.on("disconnect", () => {
      const userId = userSession.unlinkSocket(socket.id);
      if (userId) {
        aiModel.cleanupAIModel(userId);
        cleanupVideoBuffers(userId);
      }
      aiModel.unregisterModel(socket.id);
    });
  });

  return io;
}
