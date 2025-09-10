import {io} from "socket.io-client";

const socket = io("https://localhost:3001", {
    transports: ["websocket"],
    rejectUnauthorized: false,
});

socket.on("connect", () => {
    console.log("Connected to backend server");
    console.log("Socket ID:", socket.id);
    
    socket.emit("webDetectRes", {
        "Person": 0,
        "Mobile": 1,
        "Laptop": 0,
        "userId":1,
        "examId":1
    });
});

socket.on("disconnect", () => {
    console.log("Disconnected from backend server");
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});