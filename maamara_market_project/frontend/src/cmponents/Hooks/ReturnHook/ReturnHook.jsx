// src/hooks/usePendingReturns.js
import { useEffect, useState } from "react";
import { baseUrl } from "../../Constant/Constant";
import api from "../../../Services/Api";

export const usePendingReturns = () => {
  const [returns, setReturns] = useState([]);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;

    const fetchReturns = async () => {
      try {
        setLoading(true);
        const res = await api.get(`${baseUrl}/api/returns/pending/`, {
          withCredentials: true,
        });

        if (isMounted) {
          setReturns(res.data.results || res.data); // supports paginated or direct list
          setData(res.data)
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching pending returns:", err);
          setError(err.response?.data || "Failed to fetch pending returns");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchReturns();

    return () => {
      isMounted = false;
    };
  }, []);

  return { returns, loading, error, data };
};
