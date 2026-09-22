import { useEffect, useRef, useState } from "react";

export function useVendorOrdersCombined() {
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef(null);

  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);

  const connect = () => {
    const WS_URL = `ws://${window.location.host}/ws/vendor-orders/`;

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "orders_update") {
          setPending(Array.isArray(data.pending) ? data.pending : []);
          setCompleted(Array.isArray(data.completed) ? data.completed : []);
          setLoading(false);
        }
      } catch {
        // Keep the current UI state and wait for the next valid payload.
        // WebSocket transport/parse errors should not be rendered as UI errors.
      }
    };

    ws.onerror = () => {
      // Keep loading/reconnect behavior silent. The browser WebSocket error
      // event is an Event object and should never be rendered to the user.
    };

    ws.onclose = () => {
      wsRef.current = null;

      const timeout = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
      reconnectAttempt.current += 1;

      reconnectTimeout.current = setTimeout(() => {
        connect();
      }, timeout);
    };
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeout.current) {
        clearTimeout(reconnectTimeout.current);
      }

      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return {
    pending,
    completed,
    loading,
  };
}
