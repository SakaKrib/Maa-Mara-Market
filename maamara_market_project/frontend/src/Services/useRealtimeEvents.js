import { useEffect, useRef } from "react";

/**
 * Build the realtime WebSocket URL from the current browser origin.
 *
 * Vite proxies /ws to the Django Channels backend in development,
 * so the browser connects to the same host that served the application.
 */
function websocketUrl() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return protocol + "//" + window.location.host + "/ws/realtime/";
}

/**
 * Subscribe to the server-authoritative realtime event stream.
 *
 * Events are notifications/invalidation signals. Components should refetch
 * their REST resource rather than treating websocket payloads as state truth.
 */
export function subscribeToRealtimeEvents(onEvent) {
  if (typeof onEvent !== "function") return () => {};

  const handler = (event) => onEvent(event.detail);
  window.addEventListener("maamara:realtime", handler);

  return () => window.removeEventListener("maamara:realtime", handler);
}

export default function useRealtimeEvents(onEvent, { models, actions } = {}) {
  const callbackRef = useRef(onEvent);
  const modelsRef = useRef(models);
  const actionsRef = useRef(actions);

  callbackRef.current = onEvent;
  modelsRef.current = models;
  actionsRef.current = actions;

  useEffect(() => {
    let socket;
    let retryTimer;
    let stopped = false;

    const matches = (event) => {
      const modelMatch =
        !modelsRef.current?.length ||
        modelsRef.current.includes(event.model);

      const actionMatch =
        !actionsRef.current?.length ||
        actionsRef.current.includes(event.action);

      return modelMatch && actionMatch;
    };

    const scheduleReconnect = () => {
      if (!stopped && !retryTimer) {
        retryTimer = window.setTimeout(() => {
          retryTimer = undefined;
          connect();
        }, 2000);
      }
    };

    const connect = () => {
      if (stopped) return;

      try {
        socket = new WebSocket(websocketUrl());
      } catch (error) {
        console.error("Unable to create realtime WebSocket:", error);
        scheduleReconnect();
        return;
      }

      socket.onopen = () => {
        // The server controls all business mutations. This socket is receive-only.
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);

          if (event.type !== "realtime.event" || !matches(event)) {
            return;
          }

          callbackRef.current?.(event);
          window.dispatchEvent(
            new CustomEvent("maamara:realtime", { detail: event })
          );
        } catch (error) {
          console.error("Invalid realtime websocket payload", error);
        }
      };

      socket.onclose = () => {
        socket = undefined;
        scheduleReconnect();
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      stopped = true;
      if (retryTimer) {
        window.clearTimeout(retryTimer);
        retryTimer = undefined;
      }
      socket?.close();
      socket = undefined;
    };
  }, []);
}