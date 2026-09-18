import React from "react";
import MobileBottomSheet from "./MobileBottomSheet";
import { useCartContext } from "../../../Customer/DesktopView/Main/CartHook/cart";
import { useNavigate } from "react-router-dom";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

const MobileCartModal = ({ open, onClose }) => {
  const { order } = useCartContext();
  const navigate = useNavigate();
  const cartItems = order?.items || [];
  const subtotal = Number(order?.order?.total || 0);
  const totalQty = Number(order?.order?.total_qty || 0);

  const handleCheckout = () => {
    navigate(order?.exchange_credit > 0 ? "/shopping-cart" : "/checkout-page");
    onClose?.();
  };

  const getImage = (image) => image?.startsWith("http") ? image : `${baseUrl}${image || ""}`;

  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Your Cart">
      {cartItems.length === 0 ? (
        <div className="mm-mobile-empty-state">
          <p>Your cart is empty</p>
          <button type="button" className="primary-button" onClick={() => { onClose?.(); navigate("/list"); }}>
            Continue shopping
          </button>
        </div>
      ) : (
        <div className="mm-mobile-sheet-stack">
          <div className="mm-mobile-sheet-list">
            {cartItems.map((item) => {
              const availableStock = item.variants?.length
                ? item.variants.reduce((sum, variant) => sum + Number(variant.quantity_in_stock || 0), 0)
                : Number(item.in_stock || 0);
              return (
                <div key={item.id} className="mm-mobile-line-item">
                  <img src={getImage(item.image)} alt={item.name || "Cart item"} />
                  <div className="mm-mobile-line-copy">
                    <strong>{item.name}</strong>
                    <span>Qty: {item.quantity}</span>
                    <small>Stock left: {Math.max(availableStock - Number(item.quantity || 0), 0)}</small>
                  </div>
                  <strong>KES {Number(item.final_price || 0).toLocaleString()}</strong>
                </div>
              );
            })}
          </div>
          <div className="mm-mobile-sheet-summary">
            <div><span>Items</span><strong>{totalQty}</strong></div>
            <div><span>Subtotal</span><strong>KES {subtotal.toLocaleString()}</strong></div>
            <button type="button" className="primary-button mm-mobile-full-button" onClick={handleCheckout}>
              Checkout
            </button>
          </div>
        </div>
      )}
    </MobileBottomSheet>
  );
};

export default MobileCartModal;