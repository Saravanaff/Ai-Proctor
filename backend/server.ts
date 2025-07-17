import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const server = createServer(app);
const io = new Server(server, {transports:["polling","websocket"], cors: { 
  origin: "*",
  methods:["GET","POST"],
},
 });

let pythonSocket: any = null;
io.on("connection", (socket) => {
  console.log("A client connected");

  socket.on("register-python", () => {
    console.log("🐍 Python connected");
    pythonSocket = socket;
  });

  socket.on("photo-save", (data) => {

    if (pythonSocket) {
      pythonSocket.emit("save-face-data", data)
    }
  });

  if (pythonSocket) {
    pythonSocket.on("face_data_saved", (data: any) => {
      console.log("Result from Python", data);

    });
  }

  socket.on("authenticate", (data) => {
    if (pythonSocket) {
      pythonSocket.emit("drag_camera", data);
    }
  });

  if (pythonSocket) {
    pythonSocket.on("drag_camera_result", (data: any) => {
      if (data) {
        console.log("Drag camera Result : ", data);
        socket.emit('alert',data);
      }

    })
  }

  socket.on("frame", (data) => {

    if (pythonSocket) {
      pythonSocket.emit("process-frame", data);
    }
  });


  if (pythonSocket) {
    pythonSocket.on("result", (data: any) => {
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
