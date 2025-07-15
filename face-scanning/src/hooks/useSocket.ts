import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";

interface UseSocketOptions {
  autoConnect?: boolean;
  auth?: {
    token?: string;
    userId?: string;
    [key: string]: any;
  };
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

interface UseSocketReturn {
  socket: Socket | null;
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data?: any) => void;
  updateAuth: (auth: any) => void;
}

const SOCKET_URL = "http://localhost:3001";

export const useSocket = (options: UseSocketOptions = {}): UseSocketReturn => {
  const {
    autoConnect = true,
    auth,
    onConnect,
    onDisconnect,
    onError,
  } = options;

  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = () => {
    if (socketRef.current?.connected) {
      return;
    }

    setIsConnecting(true);
    setError(null);

    const socketInstance = io(SOCKET_URL, {
      auth: auth || {},
      autoConnect: false,
      transports: ["websocket", "polling"],
      timeout: 20000,
      forceNew: true,
    });

    // Connection event handlers
    socketInstance.on("connect", () => {
      console.log("Socket connected:", socketInstance.id);
      setIsConnected(true);
      setIsConnecting(false);
      setError(null);
      onConnect?.();
    });

    socketInstance.on("disconnect", (reason) => {
      console.log("Socket disconnected:", reason);
      setIsConnected(false);
      setIsConnecting(false);
      onDisconnect?.();
    });

    socketInstance.on("connect_error", (err) => {
      console.error("Socket connection error:", err);
      setError(err.message);
      setIsConnecting(false);
      setIsConnected(false);
      onError?.(err);
    });

    socketInstance.on("error", (err) => {
      console.error("Socket error:", err);
      setError(err.message || "Socket error occurred");
      onError?.(err);
    });

    // Authentication events
    socketInstance.on("auth_success", (data) => {
      console.log("Authentication successful:", data);
      setError(null);
    });

    socketInstance.on("auth_error", (data) => {
      console.error("Authentication failed:", data);
      setError(data.message || "Authentication failed");
      onError?.(data);
    });

    socketRef.current = socketInstance;
    socketInstance.connect();
  };

  const disconnect = () => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
      setIsConnected(false);
      setIsConnecting(false);
    }
  };

  const emit = (event: string, data?: any) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(event, data);
    } else {
      console.warn("Socket not connected. Cannot emit event:", event);
    }
  };

  const updateAuth = (newAuth: any) => {
    if (socketRef.current) {
      socketRef.current.auth = { ...socketRef.current.auth, ...newAuth };
      // Reconnect with new auth
      if (socketRef.current.connected) {
        socketRef.current.disconnect();
        socketRef.current.connect();
      }
    }
  };

  useEffect(() => {
    if (autoConnect) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, []);

  // Update auth when it changes
  useEffect(() => {
    if (auth && socketRef.current) {
      updateAuth(auth);
    }
  }, [auth]);

  return {
    socket: socketRef.current,
    isConnected,
    isConnecting,
    error,
    connect,
    disconnect,
    emit,
    updateAuth,
  };
};
