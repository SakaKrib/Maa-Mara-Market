import { useEffect, useState, useRef } from "react";
import { useAuth } from "../../Auth/AuthContext/Context";
import api from "../../../Services/Api"; // your configured api client

export function useCustomerSocket() {
  const [customers, setCustomers] = useState([]);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);
  const reconnectTimer = useRef(null);
  const reconnectInterval = useRef(1000);
  const { user } = useAuth();
  const userId = user?.id;


  // WebSocket connection for live updates (same as before)
  useEffect(() => {
    if (!userId) return;

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost = "127.0.0.1:8000"; // Django backend
    const socketUrl = `${wsScheme}://${backendHost}/ws/customers/${userId}/`;
    console.log("Connecting WebSocket to:", socketUrl);

    function connect() {
      socketRef.current = new WebSocket(socketUrl);

      socketRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        setConnected(true);
        reconnectInterval.current = 1000; // reset reconnect interval
      };

      socketRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("📩 Received:", data);
          if (data?.customers) {
            setCustomers(data.customers);
          }
        } catch (err) {
          console.warn("⚠️ Error parsing message:", err);
        }
      };

      socketRef.current.onerror = (error) => {
        console.warn("⚠️ WebSocket error:", error);
      };

      socketRef.current.onclose = () => {
        console.log("🔌 WebSocket closed. Reconnecting...");
        setConnected(false);
        reconnectTimer.current = setTimeout(() => {
          connect();
          reconnectInterval.current = Math.min(reconnectInterval.current * 2, 30000);
        }, reconnectInterval.current);
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimer.current);
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
    };
  }, [userId]);

  return { customers, connected };
}
