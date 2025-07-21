import { io } from "socket.io-client";

const socket = io("https://192.168.87.168:3001/");

export default socket;
