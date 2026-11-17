// 📁 src/components/Hooks/Vendor/useVendorPendingItems.js
import { useEffect, useState } from "react";
import api from "../../../Services/Api";

export const useVendorCompleteItems = (enabled = true) => {
  const [data, setData] = useState({
    total_pending_items: 0,
    total_quantity: 0,
    pending_items: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return undefined;
    }
    const fetchPendingItems = async () => {
      setLoading(true);
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
  }, [enabled]);

  return { data, loading, error };
};
