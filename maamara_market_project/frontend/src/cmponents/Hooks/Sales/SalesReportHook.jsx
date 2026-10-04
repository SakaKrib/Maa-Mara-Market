import { useState, useEffect } from "react";
import api from "../../../Services/Api";

const useMonthlySalesReport = (year, month) => {
  const [sales, setSales] = useState([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [availableMonths, setAvailableMonths] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!year || !month) return;

    const fetchSales = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/monthly-sales-report/", {
          params: { year, month },
        });

        setSales(response.data.sales ?? []);
        setTotalAmount(response.data.total_amount ?? 0);
        setAvailableMonths(response.data.available_months ?? []);
      } catch (err) {
        console.error("Failed to fetch monthly sales report:", err);
        setError(
          err.response?.data?.detail ||
            "Failed to fetch monthly sales report"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, [year, month]);

  return { sales, totalAmount, availableMonths, loading, error };
};

export default useMonthlySalesReport;
