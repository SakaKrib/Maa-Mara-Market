import React, { useState } from "react";
import api from "../../../../../../Services/Api";
import { Button } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useCartContext } from "../CartHook/cart";
import AppSnackbar, { notifySnackbar } from "../../../../../../../components/ui/app-snackbar";

// Helper to read CSRF token from cookies
function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(";").shift();
  return null;
}

const RemoveFromCartButton = ({ itemId, cartItemId, variantId, sizeId, ageVariantId, selectedLength, selectedWeight, shoeSize, onRemoved }) => {
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const { refreshCart } = useCartContext();

  const handleClose = () =>
    setSnackbar(prev => ({ ...prev, open: false }));

  const handleRemove = async () => {
    setLoading(true);

    try {
      const csrfToken = getCookie("csrftoken"); // get CSRF from cookie

      const res = await api.delete(`/api/cart/remove/${itemId}/`, {
        headers: {
          "X-CSRFToken": csrfToken,
        },
        data: { cart_item_id: cartItemId, selected_color: variantId, selected_size: sizeId, selected_age_group: ageVariantId, selected_length: selectedLength, selected_weight: selectedWeight, selected_shoe_size: shoeSize },
        withCredentials: true, // ensures cookies (session/auth) are sent
      });
      refreshCart();

      if (res.data.success) {
        // Notify user
        // The cart line (and this button) unmounts after the cart refresh,
        // so raise the success message at app level.
        notifySnackbar(res.data.message || "Item removed from cart", "success");

        // Update local UI
        if (onRemoved) onRemoved(itemId);

        
      } else {
        setSnackbar({
          open: true,
          message: res.data.message || "Could not remove item",
          severity: "error",
        });
      }
    } catch (err) {
      console.error("Remove cart error:", err);
      setSnackbar({
        open: true,
        message: "Something went wrong",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={handleRemove}
        color="error"
        variant="outlined"
        disabled={loading}
      >
        <><DeleteOutlineIcon fontSize="small" /><span className="hidden sm:inline">{loading ? "Removing..." : "Remove"}</span></>
      </Button>

      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleClose} />
    </>
  );
};

export default RemoveFromCartButton;
