// hooks/useItems.js
import { useEffect, useState } from 'react';
import { baseUrl } from '../../../cmponents/Constant/Constant';

const formatItem = (item) => {
  const originalPrice = item.discount > 0
    ? (item.price / (1 - item.discount / 100)).toFixed(0)
    : item.price;

  return {
    ...item,
    formattedPrice: `KES ${item.price.toLocaleString()}`,
    formattedOriginalPrice: item.discount > 0 ? `KES ${Number(originalPrice).toLocaleString()}` : null,
    hasDiscount: item.discount > 0,
  };
};

// ✅ Allow optional itemId to fetch a single item or list
const useItems = (initialUrl = `${baseUrl}/api/items/`) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);

  const fetchItems = async (url) => {
    try {
      setLoading(true);
      const res = await fetch(url, {
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      console.log(data);

      const formattedItems = (data.results || []).map(formatItem);
      setItems(formattedItems);
      setNextUrl(data.next);
      setPrevUrl(data.previous);
    } catch (error) {
      console.error("Error fetching items:", error);
      setItems([]);
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
