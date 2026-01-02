// AddToCartButton.jsx
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

const AddToCartButton = ({ itemId }) => {
  const [toast, setToast] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  
  const {refreshCart} = useCartContext();
  const handleClose = () => {
    setToast((prev) => ({ ...prev, open: false }));
  };

  const handleAddToCart = async () => {
    try {
      const res = await api.post(
        `${baseUrl}/api/cart/add/${itemId}/`,
        {},
        { withCredentials: true } // ✅ ensure cookies are sent
      );
      refreshCart();

      setToast({
        open: true,
        message: res.data.message || "Item added to cart!",
        severity: "success",
      });
      
    } catch (error) {
      console.error(error.response || error);
      setToast({
        open: true,
        message: error.response?.data?.error || "Invalid item. Please try again.",
        severity: "error",
      });
    }
  };

  return (
    <>
      <button
        onClick={handleAddToCart}
        className="ring-1 rounded-full px-4 py-2 hover:text-gray-500 hover:bg-blue-200"
      >
        <CartIcon fontSize="small" /> Add to Cart
      </button>

      {/* Snackbar Toast */}
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

export default AddToCartButton;
