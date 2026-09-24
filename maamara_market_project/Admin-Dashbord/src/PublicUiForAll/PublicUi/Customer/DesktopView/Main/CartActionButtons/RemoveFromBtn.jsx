import React, { useState } from "react";
import api from "../../../../../../Services/Api";
import { Button } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import { useCartContext } from "../CartHook/cart";

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
        setSnackbar({
          open: true,
          message: res.data.message || "Item removed from cart",
          severity: "success",
        });

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

      {toast.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {toast.message}
          <button type="button" onClick={handleClose} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button>
        </div>
      )}
    </>
  );
};

export default RemoveFromCartButton;
