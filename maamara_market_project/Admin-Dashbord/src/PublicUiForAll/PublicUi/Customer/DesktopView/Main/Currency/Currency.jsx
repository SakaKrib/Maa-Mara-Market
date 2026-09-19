import { useEffect, useState } from "react";
import api from "../../../../../../Services/Api";

export const useCurrencyRates = () => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRates = async () => {
      try {
        const res = await api.get("/api/currency/rates/");

        setRates(res.data?.rates ?? {});
      } catch (err) {
        console.error("Currency fetch failed:", err);
        setRates({});
      } finally {
        setLoading(false);
      }
    };

    fetchRates();
  }, []);

  return { rates, loading };
};
