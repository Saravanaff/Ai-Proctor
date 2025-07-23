import { io } from "socket.io-client";
// import './envConfig.ts'
 

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "hello";
console.log("Connecting to server at:", SERVER_URL);

const socket = io(SERVER_URL);

export default socket;
