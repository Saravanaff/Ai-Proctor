import { Socket } from 'socket.io';

const userToSocket = new Map<string, string>();
const socketToUser = new Map<string, string>();
const isCapture = new Set<string>();

export function linkSocketToUser(socketId: string, userId?: string | null) {
  if (!userId) return;
  const uid = String(userId);
  const prev = userToSocket.get(uid);
  if (prev && prev !== socketId) {
    socketToUser.delete(prev);
  }
  userToSocket.set(uid, socketId);
  socketToUser.set(socketId, uid);
}

export function unlinkSocket(socketId: string): string | undefined {
  const uid = socketToUser.get(socketId);
  if (!uid) return undefined;
  
  socketToUser.delete(socketId);
  const active = userToSocket.get(uid);
  if (active === socketId) {
    userToSocket.delete(uid);
  }
  isCapture.delete(uid);
  
  return uid;
}

export function getUserSocket(userId: string): string | undefined {
  return userToSocket.get(String(userId));
}

export function getUserId(socketId: string): string | undefined {
  return socketToUser.get(socketId);
}

export function resolveUserId(socket: Socket): string | null {
  const fromAuth = socket?.handshake?.auth?.userId;
  return fromAuth != null ? String(fromAuth) : null;
}

export function setCapture(userId: string, value: boolean) {
  if (value) {
    isCapture.add(userId);
  } else {
    isCapture.delete(userId);
  }
}

export function isCapturing(userId: string): boolean {
  return isCapture.has(userId);
}
