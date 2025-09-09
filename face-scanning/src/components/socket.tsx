import { io } from "socket.io-client";
import { getUserId } from "@/constants/AuthStore";

const SERVER_URL = "https://localhost:3001";

function currentUserId(): string | null {
  try {
    const id = getUserId?.();
    if (id) return id;
  } catch { }
  try {
    if (typeof window !== "undefined") return window.localStorage.getItem("userId");
  } catch { }
  return null;
}

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  auth: { userId: currentUserId() || "" },
});

export default socket;
