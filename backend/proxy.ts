import express from "express";
import { createServer as createHttpsServer } from "https";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import cors from "cors";
import { createProxyMiddleware } from "http-proxy-middleware";
import { io as clientIo, Socket as ClientSocket } from "socket.io-client";

const app = express();

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: true
}));

// 🔐 Load certificates
const key = fs.readFileSync(path.join(__dirname, "localhost-key.pem"));
const cert = fs.readFileSync(path.join(__dirname, "localhost-cert.pem"));
const ca = fs.readFileSync(path.join(__dirname, "rootCA.pem"));

const httpsServer = createHttpsServer({ key, cert, ca }, app);

// 🔄 Proxy middleware for REST & WebSocket traffic
const proxy = createProxyMiddleware({
  target: "http://localhost:3001",
  changeOrigin: true,
  ws: false,
  on: {
    proxyReq: (proxyReq, req, res) => {
      console.log(`🔄 Proxying: ${req.method} ${req.url} -> http://localhost:3001${req.url}`);
    },
    proxyRes: (proxyRes, req, res) => {
      console.log(`✅ Response: ${proxyRes.statusCode} for ${req.method} ${req.url}`);
    },
    error: (err, req, res) => {
      console.error(`❌ Proxy Error: ${err.message}`);
      if (res && "writeHead" in res && typeof res.writeHead === "function") {
        try {
          if (!res.headersSent) {
            res.writeHead(503, { "Content-Type": "application/json" });
            res.end(JSON.stringify({
              success: false,
              message: "Backend service unavailable",
              error: err.message
            }));
          }
        } catch (writeError) {
          console.error("Error writing response:", writeError);
        }
      }
    }
  }
});

app.get("/", (req, res) => {
  res.send("Proxy HTTPS server running");
});

app.get("/ca", (req, res) => {
  res.setHeader("Content-Type", "application/x-pem-file");
  res.download(path.join(__dirname, "rootCA.pem"), "rootCA.pem");
});

app.use((req, res, next) => {
  if (req.path === "/" || req.path === "/ca" || req.path.startsWith("/socket.io/")) {
    return next();
  }
  return proxy(req, res, next);
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


  socket.onAny((event, ...args) => {
    
    if (backendSocket?.connected) {
      backendSocket.emit(event, ...args);
    } else {
      console.warn(`⚠️ Backend not connected, dropping event: ${event}`);
    }
  });


  backendSocket.onAny((event, ...args) => {
    socket.emit(event, ...args);
  });

  socket.on("disconnect", () => {
    console.log("⚡ Frontend client disconnected");
  });
});

httpsServer.listen(3002, () => {
  console.log("🚀 HTTPS Proxy Server running at https://localhost:3002");
});
