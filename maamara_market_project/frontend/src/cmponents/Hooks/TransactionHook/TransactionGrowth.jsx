// src/cmponents/Hooks/Analytics/useRevenueGrowth.js

import { useEffect, useState } from "react";
import api from "../../../Services/Api";

const useRevenueGrowth = () => {
  const [data, setData] = useState({
    weekly: {},
    monthly: {},
  });

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchRevenueGrowth = async () => {
      try {
        setLoading(true);

        const response = await api.get("/api/revenue-growth/");

        setData(response.data);

      } catch (err) {
        console.error(err);
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRevenueGrowth();
  }, []);

  return {
    data,
    loading,
    error,
  };
};

export default useRevenueGrowth;