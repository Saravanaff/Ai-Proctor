import express from "express";
import { createServer as createHttpsServer } from "http";
import { Server } from "socket.io";
import { createCA, createCert } from "mkcert";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";
import {
  initMediasoup,
  getRtpCapabilities,
  createTransport,
  connectTransport,
  produce,
} from "./mediasoupServer"; // adjust path as needed

dotenv.config({ path: path.join(__dirname, ".env") });

let isCapture = false;
const serverPort = 3001;

let cnt = 0;

async function startServer() {
  // const key = fs.readFileSync(path.join(__dirname, "localhost-key.pem"));
  // const cert = fs.readFileSync(path.join(__dirname, "localhost-cert.pem"));
  // const ca = fs.readFileSync(path.join(__dirname, "rootCA.pem"));

  const app = express();

  app.get("/", (req, res) => {
    res.send("DVD");
  });

  app.get("/ca", (req, res) => {
    const caPath = path.join(__dirname, "rootCA.pem");
    res.setHeader("Content-Type", "application/x-pem-file");
    res.download(caPath, "rootCA.pem");
  });

  const httpsServer = createHttpsServer(app);

  const io = new Server(httpsServer, {
    transports: ["websocket", "polling"],
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
    },
  });

  let pythonSocket: any = null;
  let proxy: any = null;

  io.on("connection", (socket) => {
    console.log("A client connected");
    // cnt++;
    // console.log("count : ", cnt);

    socket.on("getRtpCapabilities", (cb) => {
      cb({ rtpCapabilities: getRtpCapabilities() });
    });

    socket.on("createWebRtcTransport", async ({ direction }, cb) => {
      const transportOptions = await createTransport();
      cb(transportOptions);
    });

    socket.on(
      "connectTransport",
      async ({ transportId, dtlsParameters }, cb) => {
        await connectTransport(transportId, dtlsParameters);
        cb();
      }
    );

    socket.on("produce", async ({ transportId, kind, rtpParameters }, cb) => {
      const id = await produce(transportId, kind, rtpParameters);
      cb({ id });
    });

    socket.on("register-python", () => {
      console.log("🐍 Python connected");
      pythonSocket = socket;
    });

    socket.on("proxy", () => {
      console.log("proxy connected successfully");
      proxy = socket;
      if (proxy) {
        proxy.on("videos", (data: any) => {
          // console.log("third");
          if (pythonSocket) {
            pythonSocket.emit("thirdeye_cam", data);
          }
        });
      }
    });

    socket.on("photo-save", (data) => {
      if (pythonSocket) {
        isCapture = true;
        pythonSocket.emit("save-face-data", data);
        console.log("Face Data :", data);
      }
    });

    socket.on("authenticate", (data) => {
      if (pythonSocket) {
        pythonSocket.emit("drag_camera", data);
      }
    });

    socket.on("frame", (data) => {
      if (pythonSocket && !isCapture) {
        pythonSocket.emit("process-frame", data);
      }
    });

    if (pythonSocket) {
      pythonSocket.on("thirdeye_cam_result", (data: any) => {
        if (data) {
          console.log("Third Eye Camera Result : ", data);
          socket.emit("thirdeye_alert", data);
        }
      });

      pythonSocket.on("face_data_saved", (data: any) => {
        isCapture = false;
        socket.emit("face_save_status", data);
        console.log("Result from Python", data);
      });

      pythonSocket.on("drag_camera_result", (data: any) => {
        if (data) {
          // console.log("Drag camera Result : ", data);
          socket.emit("alert", data);
        }
      });

      pythonSocket.on("result", (data: any) => {
        console.log("data : ", data, isCapture);
        if (!isCapture) {
          socket.emit("fres", data);
        }
      });
    }

    socket.on("disconnect", () => {
      console.log("A client disconnected");
      cnt--;
      console.log("count : ", cnt);
    });
  });

  httpsServer.listen(serverPort, () => {
    console.log(`✅ HTTP Socket.IO server running at ${serverPort}`);
  });
}

(async () => {
  await initMediasoup();
  await startServer();
})().catch(console.error);
