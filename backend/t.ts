import {io} from "socket.io-client";

const socket = io("https://localhost:3001", {
    transports: ["websocket"],
    rejectUnauthorized: false,
});

socket.on("connect", () => {
    console.log("Connected to backend server");
    console.log("Socket ID:", socket.id);
    
    socket.emit("start-exam", {
        user_id: 1,
        exam_id: 1,
        timestamp:new Date(),
        status: "success",
        message: "Exam Started successfully",
      });

      setTimeout(() => {
        socket.emit("end-exam", {
          user_id: 1,
          exam_id: 1,
          timestamp:new Date(),
          status: "success",
          message: "Exam Ended successfully",
        });
      }, 2000);
});

socket.on("disconnect", () => {
    console.log("Disconnected from backend server");
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});