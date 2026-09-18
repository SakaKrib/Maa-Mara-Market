import React, { useState } from "react";
import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import CartIcon from "@mui/icons-material/ShoppingCartOutlined";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { useCartContext } from "../CartHook/cart";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const AddToCartButton = ({
  itemId,
  quantity,
  variantId = null,
  sizeId = null,
  ageVariantId = null,
  lengthId = null,
  weightId = null,
  shoeId = null,
  selectedShoeSize = null,
  availableStock,
  remainingStock,
  disabled = false,
  onAddSuccess,
}) => {
  const [adding, setAdding] = useState(false);
  const [toast, setToast] = useState({ open: false, message: "", severity: "success" });

  // Use your cart context to refresh cart contents after adding
  const { refreshCart } = useCartContext();

  // Close the Snackbar
  const handleClose = () => setToast(prev => ({ ...prev, open: false }));

  // Handle the Add to Cart button click
  const handleAddToCart = async () => {
    // Check if no stock available
    if (availableStock === 0) {
      setToast({ open: true, message: "This item is out of stock.", severity: "error" });
      return;
    }
    // Check if requested quantity exceeds stock
    if (quantity > availableStock) {
      setToast({ open: true, message: `Only ${availableStock} item(s) left in stock.`, severity: "error" });
      return;
    }
    if (adding) return; // Prevent double clicks

    try {
      setAdding(true);
      const res = await api.post(
        `${baseUrl}/api/cart/add/${itemId}/`,
        { quantity, variant_id: variantId, size_id: sizeId, age_variant_id: ageVariantId, length_id: lengthId, weight_id: weightId, shoe_id: shoeId, selected_shoe_size: selectedShoeSize },
        { withCredentials: true }
      );
      // Refresh the cart context after success
      refreshCart();
      onAddSuccess?.(res.data);
      setToast({ open: true, message: res.data.message || "Item added to cart!", severity: "success" });
    } catch (error) {
      setToast({
        open: true,
        message: error.response?.data?.error || "Stock changed. Please refresh and try again.",
        severity: "error",
      });
    } finally {
      setAdding(false);
    }
  };

  // Disable button if:
  // - disabled prop passed
  // - currently adding
  // - quantity exceeds available stock
  // - no stock available
  const isButtonDisabled =
    disabled || adding || quantity > availableStock || availableStock === 0;

  // Button text logic, including special text for last item
  const buttonText = adding
    ? "Adding..."
    : availableStock === 0
    ? "Out of Stock"
    : quantity > availableStock
    ? "Not Enough Stock"
    : remainingStock === 0
    ? "Last Item!"
    : "Add to Cart";

  return (
    <>
      <button
        type="button"
        onClick={handleAddToCart}
        disabled={isButtonDisabled}
        className={`ring-1 rounded-full px-4 py-2 hover:text-gray-500 hover:bg-blue-200 ${
          isButtonDisabled ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <CartIcon fontSize="small" /> {buttonText}
      </button>

      <Snackbar
        open={toast.open}
        autoHideDuration={4000}
        onClose={handleClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleClose} severity={toast.severity} sx={{ width: "100%" }}>
          {toast.message}
        </Alert>
      </Snackbar>
    </>
  );
};

// Default props for optional props
AddToCartButton.defaultProps = {
  quantity: 1,