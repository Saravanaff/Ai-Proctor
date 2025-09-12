import {io} from "socket.io-client";

const socket = io("https://localhost:3001", {
    transports: ["websocket"],
    rejectUnauthorized: false,
});

socket.on("connect", () => {
    console.log("Connected to backend server");
    console.log("Socket ID:", socket.id);
    
    for(var i=0;i<10;i++){
        socket.emit("webDetectRes",{
            "userId": 1,
            "examId": 1,
            "data": {"Mobile":1, "Person":0, "Laptop":0},
            "code": 0,
            "timestamp": Date.now()
        });
    }


    console.log("webDetectRes event emitted successfully!");
    
    setTimeout(() => {
        console.log("Requesting exam score from backend:");
        socket.emit("submit", { userId: 1, examId: 1 });
    }, 1000);
});

socket.on("exam_score", (response) => {
    console.log("Received exam score from backend:");
    console.log(response);
    console.log(response.score.violationFrames);
});

socket.on("disconnect", () => {
    console.log("Disconnected from backend server");
});

socket.on("connect_error", (error) => {
    console.log("Connection error:", error.message);
});