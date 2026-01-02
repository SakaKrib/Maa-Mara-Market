import { useState, useEffect } from "react";
import api from "../../../Services/Api";
export function useVendorOrdersCombined() {
  const [pending, setPending] = useState([]);
  const [completed, setCompleted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    let intervalId = null;

    async function fetchOrders() {
      try {
        const res = await api.get("api/combined-orders/",{
            withCredentials: true
        });
        if (!isMounted) return;

        setPending(res.data.pending || []);
        setCompleted(res.data.completed || []);
        setError(null);
      } catch (err) {
        if (isMounted) setError(err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    // initial fetch
    fetchOrders();

    // refresh every 30 seconds
    intervalId = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 sec

    return () => {
      isMounted = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, []);

  return { pending, completed, loading, error };
}
