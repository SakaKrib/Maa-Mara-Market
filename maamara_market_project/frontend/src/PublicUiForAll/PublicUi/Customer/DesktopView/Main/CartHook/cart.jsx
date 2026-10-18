import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import api, { getVisitorIdentity } from "../../../../../../Services/Api";
import { useAuth } from "../../../../../../cmponents/Auth/AuthContext/Context";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const requestSequence = useRef(0);
  const { loading: authLoading, isAuthenticated, isVisitor, user } = useAuth();

  const fetchCart = async () => {
    const requestId = ++requestSequence.current;
    try {
      setLoading(true);
      const res = await api.get("/api/cart/", {
        params: { visitor_id: getVisitorIdentity() || undefined },
        withCredentials: true,
      });
      if (requestId !== requestSequence.current) return;

      if (res.data?.success) {
        setOrder(res.data);
        setError(null);
      } else {
        setError(new Error(res.data?.error || "Unable to load cart."));
      }
    } catch (err) {
      if (requestId !== requestSequence.current) return;
      // Keep the last successfully loaded cart on transient failures.
      console.error("Cart fetch error:", err);
      setError(err);
    } finally {
      if (requestId === requestSequence.current) setLoading(false);
    }
  };

  // Wait for auth restoration, then reload whenever the identity changes.
  // This prevents an anonymous/visitor response from becoming the signed-in
  // user's permanent cart state after login.
  useEffect(() => {
    if (authLoading) return;
    void fetchCart();
  }, [authLoading, isAuthenticated, isVisitor, user?.id]);

  return (
    <CartContext.Provider value={{ order, loading, error, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => useContext(CartContext);
