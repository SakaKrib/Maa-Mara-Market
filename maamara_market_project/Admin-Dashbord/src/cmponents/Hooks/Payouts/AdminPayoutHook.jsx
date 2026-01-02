import { useState, useEffect } from "react";
import api from "../../../Services/Api";  // Your axios instance or fetch wrapper

export const useAdminPayouts = () => {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // to avoid state updates after unmount

    const fetchPayouts = async () => {
      try {
        setLoading(true);
        const response = await api.get("/api/admin-payouts/", { withCredentials: true });
        if (isMounted) {
          setPayouts(response.data);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.response?.data || "Failed to fetch admin payouts");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchPayouts();

    return () => {
      isMounted = false;
    };
  }, []);

  return { payouts, loading, error };
};
