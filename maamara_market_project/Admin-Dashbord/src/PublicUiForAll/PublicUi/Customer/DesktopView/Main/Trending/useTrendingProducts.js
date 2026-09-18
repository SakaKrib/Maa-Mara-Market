import { useCallback, useEffect, useState } from "react";
import api from "../../../../../../Services/Api";

const useTrendingProducts = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const fetchItems = useCallback(async (url = "/api/items/") => {
    setLoading(true);
    try {
      const response = await api.get(url);
      const data = response.data;
      setItems(Array.isArray(data) ? data : data.results || []);
      setNextUrl(data.next || null);
      setPrevUrl(data.previous || null);
    } catch {
      setItems([]);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const updateItemStock = useCallback((itemId, newStock) => {
    setItems((current) => current.map((item) =>
      item.id === itemId ? { ...item, in_stock: newStock } : item
    ));
  }, []);

  return { items, loading, nextUrl, prevUrl, fetchItems, updateItemStock };
};

export default useTrendingProducts;
