import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import api, { getVisitorIdentity } from "../../../Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";

const WishlistContext = createContext();

export const WishlistProvider = ({ children }) => {
  const [wishlist, setWishlist] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);
  const { loading: authLoading, isAuthenticated, isVisitor, user } = useAuth();

  const fetchWishlist = useCallback(async () => {
    const requestId = ++requestSequence.current;
    try {
      setLoading(true);
      const res = await api.get("/api/wishlist/", {
        params: { visitor_id: getVisitorIdentity() || undefined },
        withCredentials: true,
      });
      if (requestId !== requestSequence.current) return;
      const data = Array.isArray(res.data?.items) ? res.data.items : [];
      setWishlist(data);
      setError(null);
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      console.error("Wishlist fetch error:", err);
      // Do not turn a temporary request failure into an apparently empty list.
      setError(err);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    void fetchWishlist();
  }, [authLoading, isAuthenticated, isVisitor, user?.id, fetchWishlist]);

  // ➕ Add
  const addToWishlist = async (itemId) => {
    try {
      const res = await api.post(
        `/api/wishlist/add/${itemId}/`,
        { visitor_id: getVisitorIdentity() || undefined },
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
        data: { visitor_id: getVisitorIdentity() || undefined },
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
