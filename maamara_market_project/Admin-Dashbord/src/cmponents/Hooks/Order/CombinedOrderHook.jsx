import { useEffect, useRef, useState } from "react";

export function useVendorOrdersCombined() {
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef(null);

  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const connect = () => {
    const WS_URL = "ws://127.0.0.1:8000/ws/vendor-orders/";

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      reconnectAttempt.current = 0;
      setError(null);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data?.type === "orders_update") {
          setPending(data.pending || []);
          setCompleted(data.completed || []);
          setLoading(false);
          setError(null);
        }
      } catch (err) {
        setError(err);
      }
    };

    ws.onerror = (err) => {
      setError(err);
      setLoading(false);
    };

    ws.onclose = () => {
      wsRef.current = null;

      // basic exponential backoff reconnect (safe production pattern)
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
    error,
  };
}