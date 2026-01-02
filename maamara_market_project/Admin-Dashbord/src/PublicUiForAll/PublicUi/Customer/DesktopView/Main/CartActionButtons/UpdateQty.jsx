import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { useCartContext } from "../CartHook/cart";
import { useState } from "react";

export function useCartActions() {
  const { refreshCart } = useCartContext(); // ✅ only use refreshCart
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateQuantity = async (itemId, action) => {
    setLoading(true);
    setError(null);

    try {
      await api.patch(
        `${baseUrl}/api/cart/${itemId}/update-quantity/`,
        { action },
        { withCredentials: true }
      );

      // Refresh cart state from server
      await refreshCart();
    } catch (err) {
      console.error("Quantity update failed:", err);
      setError("Failed to update quantity");
    } finally {
      setLoading(false);
    }
  };

  const removeFromCart = async (itemId) => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`${baseUrl}/api/cart/${itemId}/`, { withCredentials: true });

      // Refresh cart state from server
      await refreshCart();
    } catch (err) {
      console.error("Remove failed:", err);
      setError("Failed to remove item");
    } finally {
      setLoading(false);
    }
  };

  return { updateQuantity, removeFromCart, loading, error };
}
