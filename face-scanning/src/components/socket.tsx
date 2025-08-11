import { io } from "socket.io-client";
import { getUserId } from "./AuthStore";

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3001";

function currentUserId(): string | null {
  try {
    const id = getUserId?.();
    if (id) return id;
  } catch {}
  try {
    if (typeof window !== "undefined") return window.localStorage.getItem("userId");
  } catch {}
  return null;
}

const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  auth: { userId: currentUserId() || "" },
});

export default socket;
