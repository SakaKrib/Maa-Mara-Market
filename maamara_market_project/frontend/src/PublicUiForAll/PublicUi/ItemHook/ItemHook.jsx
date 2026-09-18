// hooks/useItems.js
import { useEffect, useState } from 'react';

const formatItem = (item) => {
  const originalPrice =
    item.discount > 0
      ? (item.price / (1 - item.discount / 100)).toFixed(0)
      : item.price;

  return {
    ...item,
    formattedPrice: `KES ${Number(item.price).toLocaleString()}`,
    formattedOriginalPrice:
      item.discount > 0
        ? `KES ${Number(originalPrice).toLocaleString()}`
        : null,
    hasDiscount: item.discount > 0,
  };
};

const useItems = (initialUrl = `/api/items/`) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const fetchItems = async (url) => {
    try {
      setLoading(true);

      const res = await fetch(url, {
        method: "GET",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      // ✅ support both paginated and raw list
      const results = Array.isArray(data) ? data : (data.results || []);

      const formattedItems = results.map(formatItem);

      setItems(formattedItems);
      setNextUrl(data.next || null);
      setPrevUrl(data.previous || null);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
      setNextUrl(null);
      setPrevUrl(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems(initialUrl);
  }, [initialUrl]);

  return {
    items,
    loading,
    nextUrl,
    prevUrl,
    fetchItems,
  };
};

export default useItems;