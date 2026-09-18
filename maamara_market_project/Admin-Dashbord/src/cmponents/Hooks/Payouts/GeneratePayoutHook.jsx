import { useState } from "react";
import api from "../../../Services/Api"; // adjust path if needed

export const useGenerateMonthlyPayouts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateMonthlyPayouts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post("/api/payout/generate-monthly-payouts/", {
        withCredentials: true 
      });
      setData(response.data);
    } catch (err) {
      console.error("Error generating payouts:", err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.error || 
        "Failed to generate payouts."
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    data,        // payout summary
    loading,     // boolean
    error,       // string or null
    generateMonthlyPayouts, // function to trigger the process
  };
};
