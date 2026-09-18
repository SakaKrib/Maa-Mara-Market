import { useEffect, useRef } from "react";
import { baseUrl } from "../cmponents/Constant/Constant";

function websocketUrl() {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws/realtime/";
  return url.toString();
}

export default function useRealtimeEvents(onEvent) {
  const callbackRef = useRef(onEvent);
  callbackRef.current = onEvent;

  useEffect(() => {
    let socket;
    let retryTimer;
    let stopped = false;
    const connect = () => {
      if (stopped) return;
      socket = new WebSocket(websocketUrl());
      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event.type === "realtime.event") {
            callbackRef.current?.(event);
            window.dispatchEvent(new CustomEvent("maamara:realtime", { detail: event }));
          }
        } catch (error) {
          console.error("Invalid realtime websocket payload", error);
        }
      };
      socket.onclose = () => {
        if (!stopped) retryTimer = window.setTimeout(connect, 2000);
      };
      socket.onerror = () => socket.close();
    };
    connect();
    return () => {
      stopped = true;
      window.clearTimeout(retryTimer);
      socket?.close();
    };
  }, []);
}
