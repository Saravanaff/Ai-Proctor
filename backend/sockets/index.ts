import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  getRtpCapabilities,
  createTransport,
  connectTransport,
  produce,
} from "../mediasoupServer";

import { io as ioClient } from "socket.io-client";
import {getExamScore} from "../utils/calculate";

export function initSocket(server: HttpServer) {
  const io = new Server(server, {
    transports: ["websocket", "polling"],
    cors: { origin: "*" },
  });

  const userToSocket = new Map<string, string>();
  const socketToUser = new Map<string, string>();
  const isCapture = new Set<string>();
  

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
  }

  function emitToUserById(userId: string | undefined, event: string, payload: any) {
    if (!userId) return;
    const sid = userToSocket.get(String(userId));
    if (!sid) return;
    console.log(userId, event, payload);
    io.to(sid).emit(event, payload);
  }

  function resolveUserId(socket: any): string | null {
    const fromAuth = socket?.handshake?.auth?.userId;
    return fromAuth != null ? String(fromAuth) : null;
  }

  let pythonSocket: any = null;
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

    socket.on("register-python", () => {
      if (pythonSocket) {
        pythonSocket.removeAllListeners("thirdeye_cam_result");
        pythonSocket.removeAllListeners("face_data_saved");
        pythonSocket.removeAllListeners("drag_camera_result");
        pythonSocket.removeAllListeners("result");
      }

      pythonSocket = socket;

      pythonSocket.on("thirdeye_cam_result", (data: any) => {
        emitToUserById(data?.userId, "thirdeye_alert", data);

      });

      pythonSocket.on("face_data_saved", (data: any) => {
        const uid = String(data?.userId ?? data?.user_id ?? "");
        if (uid) isCapture.delete(uid);
        emitToUserById(uid || data?.userId, "face_save_status", data);
      });

      pythonSocket.on("drag_camera_result", (data: any) => {
        emitToUserById(data?.userId, "alert", data);
      });

      pythonSocket.on("result", (data: any) => {
        // console.log(data);
        emitToUserById(data?.userId, "fres", data);
        // socket.emit("fres",data);
      });
    });

    socket.on("proxy", () => {
      proxy = socket;
      if (proxy) {
        proxy.on("videos", (data: any) => {
          if (pythonSocket) {
            pythonSocket.emit("thirdeye_cam", data);
          }
        });
        proxy.on("recorder-add-video-stream-chunk", (data: any) => {
          // console.log("chunk ,",data.chunk)
          if (storageSocket) {
            storageSocket.emit("add-video-stream-chunk", data);
          }
        });
        proxy.on("start-exam", (data: any) => {
          if (storageSocket) {
            /* For Initializing Video Recording */
            // console.log("Exam started", data);
            storageSocket.emit("start-stream-recording", data);
          }
        });
        proxy.on("end-exam", (data: any) => {
          if (storageSocket) {
            /* For Closing Video Recording */

            // const fileName = path.join(__dirname, "logs", "log.csv");
            // const score = calculateScoreOnUser(fileName);
            storageSocket.emit("stop-stream-recording", data);
          }
        });
      }
    });

    socket.on("photo-save", (data) => {
      const uid = String((data as any)?.userId ?? (data as any)?.user_id ?? "");
      if (uid) isCapture.add(uid);
      if (pythonSocket) {
        pythonSocket.emit("save-face-data", data);
      }
    });

    socket.on("authenticate", (data) => {
      // console.log(data);
      if (pythonSocket) {
        pythonSocket.emit("drag_camera", data);
      }
    });

    socket.on("submit",(data)=>{

      // console.log("hi");
      console.log(getExamScore(data.userId,data.examId));


    })

    socket.on("frame", (data) => {
      // console.log("framming...",data);
      const uid = String((data as any)?.userId ?? (data as any)?.user_id ?? "");
      if (uid && isCapture.has(uid)) return;
      if (pythonSocket) {
        pythonSocket.emit("process-frame", data);
      }
    });

    socket.on("recorder-add-video-stream-chunk", (data: any) => {
      
      // console.log("chunk ,",data.chunk)
      if (storageSocket) {
        storageSocket.emit("add-video-stream-chunk", data);
      }
    });

    socket.on("start-exam", (data: any) => {
      if (storageSocket) {
        /* For Initializing Video Recording */
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
      linkSocketToUser(socket.id, userId);
    });

    socket.on("mobile-acknowledgment", () => {
      console.log("Mobile device connected - sending acknowledgment");
      // Broadcast to all connected clients that mobile is connected
      socket.emit("mobile-connected", { status: true, timestamp: new Date() });
    });

    socket.on("disconnect", () => {
      unlinkSocket(socket.id);
    });
  });

  return io;
}
