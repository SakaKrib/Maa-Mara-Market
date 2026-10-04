import { useState, useEffect, useCallback } from "react";
import api from "../../../Services/Api";

const LOW_STOCK_ENDPOINT = "/api/low-stock-items/";
const HIGH_STOCK_ENDPOINT = "/api/high-stock-items/";
const UPDATE_STOCK_ENDPOINT = (id) => `/api/items/${id}/update-stock/`;

export function useVendorStockItems() {
  const [vendorId, setVendorId] = useState(null);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [highStockItems, setHighStockItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1️⃣ FETCH VENDOR PROFILE → GET vendor.id
  useEffect(() => {
    const fetchVendor = async () => {
      try {
        const response = await api.get(`/api/vendor-profile/single-page/`, {
          withCredentials: true,
        });

        const vendor = response.data;
        setVendorId(vendor.id); // 🔥 SET vendorId
      } catch (err) {
        console.error("Failed to fetch vendor:", err);
        setError(err);
      }
    };

    fetchVendor();
  }, []);

  // 2️⃣ FETCH STOCK ITEMS
  const fetchStockItems = useCallback(async () => {
    try {
      const [lowRes, highRes] = await Promise.all([
        api.get(LOW_STOCK_ENDPOINT),
        api.get(HIGH_STOCK_ENDPOINT),
      ]);

      setLowStockItems(lowRes.data);
      setHighStockItems(highRes.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!vendorId) return; // wait until vendorId is ready
    fetchStockItems();
  }, [vendorId, fetchStockItems]);

  // 3️⃣ REAL-TIME UPDATES USING WebSocket
  useEffect(() => {
    if (!vendorId) return; // do not connect until vendorId is known

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const backendHost = `${window.location.hostname}:8000`;
    const ws = new WebSocket(`${wsScheme}://${backendHost}/ws/stock/${vendorId}/`);

    ws.onmessage = () => {
      fetchStockItems(); // 🔥 AUTO REFRESH
    };

    ws.onerror = (e) => console.error("WebSocket error:", e);

    return () => ws.close(); // cleanup
  }, [vendorId, fetchStockItems]);

  // 4️⃣ UPDATE STOCK
  const updateStock = async (itemId, newStock) => {
    try {
      await api.patch(UPDATE_STOCK_ENDPOINT(itemId), { in_stock: newStock });
      await fetchStockItems();
      return { success: true };
    } catch (err) {
      return { success: false, error: err };
    }
  };

  return {
    vendorId,           // useful if needed elsewhere
    lowStockItems,
    highStockItems,
    loading,
    error,
    updateStock,
    refresh: fetchStockItems,
  };
}
