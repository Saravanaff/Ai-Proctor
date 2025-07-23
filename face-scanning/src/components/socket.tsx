import { io } from "socket.io-client";

const socket = io("https://192.168.55.168:3001/");

export default socket;
