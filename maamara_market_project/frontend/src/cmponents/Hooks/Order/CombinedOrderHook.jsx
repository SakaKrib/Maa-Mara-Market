import { useEffect, useRef, useState } from "react";
import api, { getWebSocketUrl } from "../../../Services/Api";

const IN_PROCESS_STATUSES = new Set([
  "PAID", "PROCESSING", "PACKING", "READY_TO_SHIP", "SHIPPED",
  "IN_TRANSIT", "OUT_FOR_DELIVERY", "DELIVERED", "AWAITING_CONFIRMATION",
]);
const COMPLETED_STATUSES = new Set(["COMPLETED"]);

const normalizeStatus = (value) => String(value || "").trim().toUpperCase();

const groupOrderLines = (payload) => {
  const lines = Array.isArray(payload) ? payload : Array.isArray(payload?.results) ? payload.results : [];
  const grouped = new Map();

  lines.forEach((line, index) => {
    const orderId = line.order_id ?? line.order?.id ?? line.id;
    if (orderId == null) return;
    const status = line.order_status || line.status || "pending";
    const key = String(orderId);
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: orderId,
        status,
        total_for_vendor: 0,
        items: [],
      });
    }
    const order = grouped.get(key);
    const quantity = Number(line.quantity) || 0;
    const unitPrice = Number(line.item_price ?? line.price) || 0;
    order.total_for_vendor += unitPrice * quantity;
    order.items.push({
      id: line.item_id ?? line.order_item_id ?? `${key}-${index}`,
      item_name: line.item_name || line.name || "Item unavailable",
      quantity,
      final_price_for_vendor: unitPrice * quantity,
    });
  });

  const orders = [...grouped.values()];
  return {
    pending: orders.filter((order) => ["PENDING_PAYMENT", "PENDING"].includes(normalizeStatus(order.status))),
    inProcess: orders.filter((order) => IN_PROCESS_STATUSES.has(normalizeStatus(order.status))),
    completed: orders.filter((order) => COMPLETED_STATUSES.has(normalizeStatus(order.status))),
  };
};

export function useVendorOrdersCombined() {
  const wsRef = useRef(null);
  const reconnectAttempt = useRef(0);
  const reconnectTimeout = useRef(null);
  const mountedRef = useRef(false);

  const [pending, setPending] = useState([]);
  const [inProcess, setInProcess] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    mountedRef.current = true;
    let fallbackTimer;

    const applyOrders = (data) => {
      if (!mountedRef.current) return;
      setPending(Array.isArray(data?.pending) ? data.pending : []);
      setInProcess(Array.isArray(data?.in_process) ? data.in_process : Array.isArray(data?.inProcess) ? data.inProcess : []);
      setCompleted(Array.isArray(data?.completed) ? data.completed : []);
      setError("");
      setLoading(false);
    };

    // REST is the initial source of truth, so orders still appear if WebSockets
    // are blocked by a proxy, TLS mismatch, or unavailable channel layer.
    api.get("/api/vendor-order-items/", { withCredentials: true })
      .then(({ data }) => {
        if (!mountedRef.current) return;
        const grouped = groupOrderLines(data);
        setPending(grouped.pending);
        setInProcess(grouped.inProcess);
        setCompleted(grouped.completed);
        setLoading(false);
        setError("");
      })
      .catch((err) => {
        if (!mountedRef.current) return;
        setError(err.response?.data?.detail || "We could not load your orders. Check your connection and try again.");
        setLoading(false);
      });

    const connect = () => {
      if (!mountedRef.current) return;
      let socket;
      try {
        socket = new WebSocket(getWebSocketUrl("/ws/vendor-orders/"));
        wsRef.current = socket;
      } catch {
        return;
      }

      socket.onopen = () => {
        reconnectAttempt.current = 0;
      };
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "orders_update") applyOrders(data);
        } catch {
          // Ignore malformed realtime messages; the REST snapshot remains usable.
        }
      };
      socket.onerror = () => {
        // REST already supplies the page, so a socket error must not strand loading.
      };
      socket.onclose = () => {
        if (wsRef.current === socket) wsRef.current = null;
        if (!mountedRef.current) return;
        const delay = Math.min(1000 * 2 ** reconnectAttempt.current, 30000);
        reconnectAttempt.current += 1;
        reconnectTimeout.current = window.setTimeout(connect, delay);
      };
    };

    // Give the REST response time to populate the page even when the socket
    // handshakes but its initial payload is delayed.
    fallbackTimer = window.setTimeout(() => {
      if (mountedRef.current) setLoading(false);
    }, 10000);
    connect();

    return () => {
      mountedRef.current = false;
      window.clearTimeout(fallbackTimer);
      if (reconnectTimeout.current) window.clearTimeout(reconnectTimeout.current);
      if (wsRef.current) {
        wsRef.current.onclose = null;
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  return { pending, inProcess, completed, loading, error };
}
