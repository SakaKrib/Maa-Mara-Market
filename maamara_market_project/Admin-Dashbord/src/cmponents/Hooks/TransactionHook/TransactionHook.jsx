import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export default function useVendorTransactions() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const res = await api.get("/api/vendor/transactions/");
        setTransactions(res.data);
      } catch (err) {
        console.error("Error fetching transactions", err);
      } finally {
        setLoading(false);
      }
    };
  
    fetchTransactions();
    const interval = setInterval(fetchTransactions, 10000); // 🔁 every 10 seconds
    return () => clearInterval(interval);
  }, []);
  

  return { transactions, loading };
}
