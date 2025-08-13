import { Server } from "socket.io";
import type { Server as HttpServer } from "http";
import {
  getRtpCapabilities,
  createTransport,
  connectTransport,
  produce,
} from "../mediasoupServer";

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
        console.log(data);
        emitToUserById(data.userId, "fres", data);
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
      if (pythonSocket) {
        pythonSocket.emit("drag_camera", data);
      }
    });

    socket.on("frame", (data) => {
      const uid = String((data as any)?.userId ?? (data as any)?.user_id ?? "");
      if (uid && isCapture.has(uid)) return;
      if (pythonSocket) {
        pythonSocket.emit("process-frame", data);
      }
    });

    socket.on("disconnect", () => {
      unlinkSocket(socket.id);
    });
  });

  return io;
}
