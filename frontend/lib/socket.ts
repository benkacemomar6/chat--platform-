import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/auth-storage";

let socket: Socket | null = null;

// Called from client effects/event handlers only. One connection per browser tab.
export function getSocket() {
  if (typeof window === "undefined") throw new Error("Socket.IO requires a browser");
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000", {
      autoConnect: false,
      // Socket.IO calls this for every connection attempt, so reconnects use
      // the latest rotated access token rather than a module-load snapshot.
      auth: (callback) => callback({ token: getAccessToken() }),
    });
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
}
