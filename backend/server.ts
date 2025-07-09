import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

let pythonSocket:any = null;
io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("register-python", () => {
    console.log("🐍 Python connected");
    pythonSocket = socket;
  });

  socket.on("frame", (data) => {
    console.log("📷 Got frame from frontend");

    if (pythonSocket) {
      pythonSocket.emit("process-frame", data);
    } else {
      console.log("⚠️ Python not connected");
    }
  });

  if (pythonSocket) {
    pythonSocket.on("result", (data:any) => {
      console.log("🎯 Result from Python", data);
      socket.emit("fres", data);
    });
  }

  socket.on("disconnect", () => {
    console.log("A client disconnected");
  });
});

server.listen(3001, () => {
  console.log("Node.js socket server running on http://localhost:3001");
});
