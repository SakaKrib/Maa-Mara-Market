// 📁 src/components/Hooks/Vendor/useVendorPendingItems.js
import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useVendorCompleteItems = () => {
  const [data, setData] = useState({
    total_pending_items: 0,
    total_quantity: 0,
    pending_items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPendingItems = async () => {
      try {
        const response = await api.get("/api/vendor-complete-order/items/", {
          withCredentials: true,
        });
        setData(response.data);
      } catch (err) {
        console.error("❌ Error fetching vendor pending items:", err);
        setError("Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchPendingItems();
  }, []);

  return { data, loading, error };
};
