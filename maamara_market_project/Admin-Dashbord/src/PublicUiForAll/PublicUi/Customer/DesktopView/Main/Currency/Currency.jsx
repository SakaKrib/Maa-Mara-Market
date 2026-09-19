import { useEffect, useState } from "react";

const getWebSocketUrl = () => {
  if (typeof window === "undefined") return null;
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/currency/`;
};

export const useCurrencyRates = () => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const url = getWebSocketUrl();
    if (!url) {
      setRates({});
      setLoading(false);
      return undefined;
    }

    let socket;
    let closedByEffect = false;

    try {
      socket = new WebSocket(url);

      socket.onopen = () => {
        socket.send(JSON.stringify({ type: "refresh" }));
      };

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data?.type === "currency_rates") {
            setRates(data.rates ?? {});
            setLoading(false);
          }
        } catch (error) {
          console.error("Invalid currency WebSocket message:", error);
        }
      };

      socket.onerror = (error) => {
        console.error("Currency WebSocket failed:", error);
        if (!closedByEffect) {
          setRates({});
          setLoading(false);
        }
      };
    } catch (error) {
      console.error("Currency WebSocket initialization failed:", error);
      setRates({});
      setLoading(false);
    }

    return () => {
      closedByEffect = true;
      socket?.close();
    };
  }, []);

  return { rates, loading };
};
