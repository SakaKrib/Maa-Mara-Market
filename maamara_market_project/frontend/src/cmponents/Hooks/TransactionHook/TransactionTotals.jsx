import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export default function useTransactionTotals() {
  const [totals, setTotals] = useState({
    paypal_total: 0,
    mpesa_total: 0,
    loading: true,
    error: null,
  });

  useEffect(() => {
    async function fetchTotals() {
      try {
        const response = await api.get("/api/transactions/totals/");
        const data = response.data; // Axios auto-parses JSON

        setTotals({
          paypal_total: data.paypal_total || 0,
          mpesa_total: data.mpesa_total || 0,
          loading: false,
          error: null,
        });
      } catch (err) {
        console.error("❌ Error fetching transaction totals:", err);
        setTotals({
          paypal_total: 0,
          mpesa_total: 0,
          loading: false,
          error: err.message || "Failed to load totals",
        });
      }
    }

    fetchTotals();
  }, []);

  return totals;
}
