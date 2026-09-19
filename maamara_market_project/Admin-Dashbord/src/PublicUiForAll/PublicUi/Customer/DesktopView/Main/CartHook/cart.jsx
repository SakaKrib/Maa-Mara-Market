import { createContext, useContext, useState, useEffect } from "react";
import api from "../../../../../../Services/Api";

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/api/cart/`, { withCredentials: true });
      if (res.data.success) {
        setOrder(res.data);
        setError(null);
      } else {
        setOrder(null);
      }
    } catch (err) {
      console.error("Cart fetch error:", err);
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch cart on mount
  useEffect(() => {
    fetchCart();
  }, []);

  return (
    <CartContext.Provider value={{ order, loading, error, refreshCart: fetchCart }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCartContext = () => useContext(CartContext);
