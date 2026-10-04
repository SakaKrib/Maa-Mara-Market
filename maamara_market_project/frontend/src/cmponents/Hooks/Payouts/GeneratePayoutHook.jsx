import { useState } from "react";
import api from "../../../Services/Api";

export const useGenerateMonthlyPayouts = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generateMonthlyPayouts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await api.post(
        "/api/payout/generate-monthly-payouts/",
        {},
        { withCredentials: true }
      );

      const generated = response.data?.generated || {};
      const generatedCount = Object.values(generated).reduce(
        (total, payouts) => total + (Array.isArray(payouts) ? payouts.length : 0),
        0
      );

      const nextData = {
        ...response.data,
        generated_count: generatedCount,
      };

      setData(nextData);
      return { success: true, data: nextData };
    } catch (err) {
      console.error("Error generating vendor payments:", err);

      const message =
        err.response?.data?.detail ||
        err.response?.data?.error ||
        "Failed to generate vendor payments.";

      setError(message);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return {
    data,
    loading,
    error,
    generateMonthlyPayouts,
  };
};
