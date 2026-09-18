import { useState } from "react";
import { useCartContext } from "./cart";
import { useCartActions } from "../CartActionButtons/UpdateQty";
import RemoveFromCartButton from "../CartActionButtons/RemoveFromBtn";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { useNavigate } from "react-router-dom";

const CartPage = () => {
  const { order, loading, refreshCart } = useCartContext();
  const { updateQuantity } = useCartActions();
  const exchangeCredit = parseFloat(order?.exchange_credit || 0) || 0;

  // discounts
  const [selectedVoucher, setSelectedVoucher] = useState(null);
  const [useWallet, setUseWallet] = useState(false);

  const wallet = parseFloat(order?.wallet?.balance || 0) || 0;
  const vouchers = order?.vouchers || [];
  const navigate = useNavigate()


  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-gray-600 text-lg">Loading cart...</p>
      </div>
    );
  }

  if (!order || order.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen text-center p-6">
        <h2 className="text-2xl font-semibold mb-3">Your cart is empty 🛒</h2>
        <p className="text-gray-500 mb-6">
          Looks like you haven’t added anything to your cart yet.
        </p>
        <a
          href="/"
          className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
        >
          Start Shopping
        </a>
      </div>
    );
  }

  const subtotal = order.order?.final_total || 0;
  const totalQty = order.order?.total_qty || 0;

  const truncateWords = (text, numWords) => {
    if (!text) return "";
    const words = text.split(" ");
    return words.length > numWords
      ? words.slice(0, numWords).join(" ") + "..."
      : text;
  };

  

  return (
  <div className="flex flex-col py-2 px-0 bg-white min-h-screen">
    {/* --- Header --- */}
    <div className="logo flex items-center justify-between border-b border-gray-300 pb-4 mb-6 fixed w-full px-4 bg-white z-10">
      <a href="#" className="flex items-center space-x-2 text-2xl font-bold text-gray-800">
        <span className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
          MMM
        </span>
        <span>
          Maa <span className="it-name">Mara</span>{" "}
          <span className="mkrt">Market</span>
        </span>
      </a>
      <span className="font-semibold hover:underline cursor-pointer">
        go to shop
      </span>
    </div>
    {/* // cart container */}
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-10 px-4 md:px-10 mt-10">
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 md:p-10">
        <h2 className="text-2xl md:text-3xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-4 mb-6 text-gray-800 dark:text-gray-100">
          Shopping Cart ({totalQty} items)
        </h2>

        {/* Cart Items */}
        <div className="flex flex-col gap-6">
          {order.items.map((item) => {
            let availableStock = item.in_stock || 0;
            if (item.variants && item.variants.length > 0) {
              availableStock = item.variants.reduce(
                (total, variant) => total + (variant.quantity_in_stock || 0),
                0
              );
            }

            return (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row gap-4 border-b border-gray-100 dark:border-gray-700 pb-4"
              >
                <img
                  src={item.image || `${baseUrl}${item.image}`}
                  alt={item.name || "Item"}
                  className="w-full sm:w-32 h-32 object-cover rounded-md"
                />

                <div className="flex flex-col justify-between w-full">
                  {/* Top */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <h3 className="font-semibold text-lg md:text-xl text-gray-800 dark:text-gray-100">
                      {truncateWords(item.name, 3)}
                    </h3>
                    <div className="p-1 bg-gray-200 dark:bg-gray-700 rounded-sm text-sm font-medium text-gray-700 dark:text-gray-200">
                      KES {(item.final_price || 0).toLocaleString()}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {truncateWords(item.description, 20)}
                  </div>

                  {/* Bottom */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mt-3 text-sm gap-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={async () => {
                          await updateQuantity(item.id, "decrease");
                          refreshCart();
                        }}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
                        disabled={item.quantity <= 1}
                      >
                        -
                      </button>
                      <span className="px-2">{item.quantity || 0}</span>
                      <button
                        onClick={async () => {
                          await updateQuantity(item.id, "increase");
                          setTimeout(refreshCart, 300);
                        }}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded text-gray-700 dark:text-gray-200"
                        disabled={item.quantity >= availableStock}
                      >
                        +
                      </button>

                      <p className="text-gray-500 dark:text-gray-400 text-xs ml-2">
                        {availableStock - item.quantity} left in stock
                      </p>
                    </div>

                    {/* Remove button */}
                    {item.id && (
                      <RemoveFromCartButton
                        itemId={item.id}
                        onRemoved={refreshCart}
                      />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ✅ Exchange Credit Display */}
        {exchangeCredit > 0 && (
          <div className="flex justify-between text-green-600 dark:text-green-400 font-medium mb-3">
            <span>Exchange Credit</span>
            <span>- KES {exchangeCredit.toLocaleString()}</span>
          </div>
        )}

        {/* descount section */}
         {/* Voucher Dropdown */}
         <div>
         {vouchers.length > 0 && (
              <div className="flex justify-between items-center">
                <label className="text-gray-700 dark:text-gray-300">
                  Apply Voucher:
                </label>
                <select
                  className="border px-3 py-2 rounded-md text-sm text-gray-700 dark:bg-gray-800 dark:text-gray-100"
                  onChange={(e) => {
                    const selected = vouchers.find(
                      (v) => v.code === e.target.value
                    );
                    setSelectedVoucher(selected || null);
                  }}
                  value={selectedVoucher?.code || ""}
                >
                  <option value="">Select a voucher</option>
                  {vouchers.map((v) => (
                    <option key={v.code} value={v.code}>
                      {v.code} — KES {v.discount}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Wallet Toggle */}
            {wallet > 0 && (
              <div className="flex justify-between items-center">
                <label className="text-gray-700 dark:text-gray-300">
                  Use Wallet Balance (KES {wallet.toLocaleString()}):
                </label>
                <input
                  type="checkbox"
                  checked={useWallet}
                  onChange={() => setUseWallet(!useWallet)}
                />
              </div>
            )}
          </div>

        {/* Summary Section */}
        <div className="mt-10 border-t border-gray-200 dark:border-gray-700 pt-6">
          <div className="flex justify-between font-semibold text-gray-800 dark:text-gray-100 mb-3">
            <span>Subtotal</span>
            <span>KES {subtotal.toLocaleString()}</span>
          </div>

          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
            Thank you for shopping at MaaMara Market. To proceed to checkout,
            click the checkout button below.
          </p>

          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <a
              href="/"
              className="flex-1 py-3 px-6 rounded-md border light-button text-gray-700 text-center text-centetransition"
            >
              Continue Shopping
            </a>

            <a
              href="/checkout-page"
              className="flex-1 py-3 px-6 rounded-md primary-button text-white rounded-md hover:bg-green-700 text-center transition"
            >
              Checkout
            </a>
          </div>
        </div>
      </div>
    </div>
    </div>
  );
};

export default CartPage;
