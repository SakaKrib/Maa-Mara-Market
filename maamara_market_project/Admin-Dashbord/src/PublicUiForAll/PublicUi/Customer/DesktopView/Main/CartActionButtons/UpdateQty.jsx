import api from "../../../../../../Services/Api";
import { useCartContext } from "../CartHook/cart";
import { useState } from "react";

export function useCartActions() {
  const { refreshCart } = useCartContext(); // ✅ only use refreshCart
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const updateQuantity = async (itemId, action, variation = {}) => {
    setLoading(true);
    setError(null);

    try {
      await api.patch(
        `/api/cart/${itemId}/update-quantity/`,
        { action, cart_item_id: variation.cartItemId, selected_color: variation.variantId, selected_size: variation.sizeId, selected_age_group: variation.ageVariantId, selected_length: variation.selectedLength, selected_weight: variation.selectedWeight, selected_shoe_size: variation.shoeSize },
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

  const removeFromCart = async (itemId, variation = {}) => {
    setLoading(true);
    setError(null);

    try {
      await api.delete(`/api/cart/${itemId}/`, { data: { cart_item_id: variation.cartItemId, selected_color: variation.variantId, selected_size: variation.sizeId, selected_age_group: variation.ageVariantId, selected_length: variation.selectedLength, selected_weight: variation.selectedWeight, selected_shoe_size: variation.shoeSize }, withCredentials: true });

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
