import { useEffect, useRef } from "react";
import { baseUrl } from "../cmponents/Constant/Constant";

function websocketUrl() {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = url.pathname.replace(/\/$/, "") + "/ws/realtime/";
  return url.toString();
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
        !modelsRef.current?.length || modelsRef.current.includes(event.model);
      const actionMatch =
        !actionsRef.current?.length || actionsRef.current.includes(event.action);
      return modelMatch && actionMatch;
    };

    const connect = () => {
      if (stopped) return;

      socket = new WebSocket(websocketUrl());

      socket.onopen = () => {
        // The server controls all business mutations. This socket is receive-only.
      };

      socket.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data);
          if (event.type !== "realtime.event" || !matches(event)) return;

          callbackRef.current?.(event);
          window.dispatchEvent(
            new CustomEvent("maamara:realtime", { detail: event })
          );
        } catch (error) {
          console.error("Invalid realtime websocket payload", error);
        }
      };

      socket.onclose = () => {
        if (!stopped) {
          retryTimer = window.setTimeout(connect, 2000);
        }
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