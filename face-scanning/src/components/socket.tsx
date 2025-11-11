import { io } from "socket.io-client";
import { getUserId } from "@/constants/AuthStore";


// Normalize server URL from env (strip accidental quotes/spaces) and prefer secure scheme
const rawServerUrl = process.env.NEXT_PUBLIC_SERVER_URL || process.env.NEXT_PUBLIC_BACKEND_URL;
function normalizeUrl(raw?: string) {
  if (!raw) return undefined;
  // remove surrounding quotes and trim spaces
  return raw.trim().replace(/^"|"$/g, "");
}
let SERVER_URL = normalizeUrl(rawServerUrl);
// If running in browser and no explicit URL provided, derive from current location
if (typeof window !== "undefined") {
  if (!SERVER_URL) {
    const proto = window.location.protocol === "https:" ? "https:" : "http:";
    SERVER_URL = `${proto}//${window.location.hostname}:3001`;
  }
  // If page is secure, ensure we use https for socket transport
  if (window.location.protocol === "https:" && SERVER_URL && SERVER_URL.startsWith("http:")) {
    SERVER_URL = SERVER_URL.replace(/^http:/, "https:");
  }
}

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

console.log("socket connecting to:", SERVER_URL);
const socket = io(SERVER_URL, {
  transports: ["websocket", "polling"],
  auth: { userId: currentUserId() || "" },
});

export default socket;
