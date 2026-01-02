import { createContext, useContext, useState, useEffect } from "react";
import api from "../../../Services/Api";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 📥 Fetch wishlist items
  const fetchWishlist = async () => {
    console.log("🚨 fetchWishlist called");
    try {
      setLoading(true);
      const res = await api.get(`/api/wishlist/`, { withCredentials: true });
      // extract items array
      const data = Array.isArray(res.data.items) ? res.data.items : [];
      setWishlist(data);
      console.log("✅ Wishlist fetched:", data);
    } catch (err) {
      console.error("❌ Wishlist fetch error:", err);
      setWishlist([]);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    console.log("🌀 WishlistProvider mounted");
    fetchWishlist();
  }, []);
  
  



  // ➕ Add
  const addToWishlist = async (itemId) => {
    try {
      const res = await api.post(
        `/api/wishlist/add/${itemId}/`,
        {},
        { withCredentials: true }
      );

      setWishlist((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        const exists = safePrev.some((w) => w.item?.id === itemId); // ✅ fixed
        return exists ? safePrev : [...safePrev, res.data];
      });
      fetchWishlist();
    } catch (err) {
      console.error("❌ Add to wishlist error:", err);
      setError(err);
    }
  };

  // 🗑 Remove
  const removeFromWishlist = async (itemId) => {
    try {
      await api.delete(`/api/wishlist/remove/${itemId}/`, {
        withCredentials: true,
      });

      setWishlist((prev) => {
        const safePrev = Array.isArray(prev) ? prev : [];
        return safePrev.filter((w) => w.item?.id !== itemId); // ✅ fixed
      });
      fetchWishlist();
    } catch (err) {
      console.error("❌ Remove from wishlist error:", err);
      setError(err);
    }
  };

  

  return (
    <WishlistContext.Provider
      value={{
        wishlist,
        loading,
        error,
        fetchWishlist,
        addToWishlist,
        removeFromWishlist,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlistContext = () => useContext(WishlistContext);
