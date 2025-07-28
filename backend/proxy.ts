
import express from "express";
import { createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { io as clientIo, Socket as ClientSocket } from "socket.io-client";

const app = express();

const key = fs.readFileSync(path.join(__dirname, "localhost-key.pem"));
const cert = fs.readFileSync(path.join(__dirname, "localhost-cert.pem"));
const ca = fs.readFileSync(path.join(__dirname, "rootCA.pem"));

const httpsServer = createHttpsServer({ key, cert, ca }, app);

app.get("/", (req, res) => {
  res.send("Proxy HTTPS server running");
});

app.get("/ca", (req, res) => {
  res.setHeader("Content-Type", "application/x-pem-file");
  res.download(path.join(__dirname, "rootCA.pem"), "rootCA.pem");
});

const ioServer = new Server(httpsServer, {
  transports: ["websocket", "polling"],
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

let backendSocket: ClientSocket;

function connectToBackend() {
  backendSocket = clientIo("http://localhost:3001", {
    transports: ["websocket"],
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  backendSocket.on("connect", () => {
    console.log("✅ Connected to backend (http://localhost:3001)");
    backendSocket.emit('proxy');

  });


  backendSocket.on("disconnect", () => {
    console.log("❌ Backend disconnected");
  });

  backendSocket.on("connect_error", (err) => {
    console.error("❌ Connection error to backend:", err.message);
  });
}

connectToBackend();

ioServer.on("connection", (socket) => {
  console.log("⚡ Frontend client connected");


  socket.on("video", (data: any) => {
    console.log("frame coming");
    if (backendSocket?.connected) {
      backendSocket.emit("videos", data);
    } else {
      console.warn("⚠️ Backend not connected");
    }
  });
});

httpsServer.listen(3002, () => {
  console.log("🚀 HTTPS Proxy Server running at https://localhost:3002");
});
