import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { useCartContext } from "../../CartHook/cart";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function CheckoutPaypalPayment() {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("SDK Validation error: 'Expected client-id to be passed'");

  const { order: cartOrder } = useCartContext();
  const location = useLocation();
  const order = location.state?.order || location.state || cartOrder;
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const kesAmount = order?.order?.final_total || order?.order?.total || 0;

  // --- WebSocket for real-time payment status ---
  useEffect(() => {
    if (!order?.order?.id) return;
    const orderId = order.order.id;
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${wsScheme}://127.0.0.1:8000/ws/orders/${orderId}/`);

    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "payment_status" && data.status === "completed") {
          navigate("/payment-success", { state: { order: order.order } });
        }
      } catch (err) {
        console.error("❌ WebSocket message error:", err);
      }
    };
    return () => socket.close();
  }, [order?.order?.id, navigate]);

  const handlePaymentApproval = async (details) => {
    setLoading(true);
    try {
      const paypalOrderId = details.id;
      if (!paypalOrderId || paypalOrderId !== order?.order?.paypal_order_id) {
        throw new Error("PayPal order does not match the local order.");
      }

      const response = await fetch(
        `/api/paypal/capture/${encodeURIComponent(paypalOrderId)}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        }
      );

      const data = await response.json();
      if (!response.ok || data.status !== "ok") {
        throw new Error(data.message || "PayPal capture failed.");
      }

      navigate("/payment-success", {
        state: { order: data.order || order.order },
      });
    } catch (error) {
      console.error("PayPal capture failed:", error);
      alert(error.message || "Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
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

      {/* --- Main content --- */}
      <div className="mt-64 w-full text-center">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">
          Choose a payment option (KES {kesAmount})
        </h2>

        <div className="w-full max-w-xs mx-auto mt-10">
          <PayPalScriptProvider options={{ "client-id": clientId, currency: "USD" }}>
            {/* --- PayPal Wallet Button --- */}
            <PayPalButtons
              fundingSource={FUNDING.PAYPAL}
              style={{ layout: "vertical", color: "blue", shape: "pill", label: "paypal", height: 45 }}
              createOrder={() => {
                const paypalOrderId = order?.order?.paypal_order_id;
                if (!paypalOrderId) {
                  throw new Error("PayPal order was not created by checkout.");
                }
                return paypalOrderId;
              }}
              onApprove={async (data) => {
                if (!loading) await handlePaymentApproval({ id: data.orderID });
              }}
              onError={(err) => console.error("PayPal wallet error:", err)}
            />

            {/* --- Debit or Credit Card Button --- */}
            <PayPalButtons
              fundingSource={FUNDING.CARD}
              style={{ layout: "vertical", color: "black", shape: "pill", label: "pay", height: 45 }}
              createOrder={() => {
                const paypalOrderId = order?.order?.paypal_order_id;
                if (!paypalOrderId) {
                  throw new Error("PayPal order was not created by checkout.");
                }
                return paypalOrderId;
              }}
              onApprove={async (data) => {
                if (!loading) await handlePaymentApproval({ id: data.orderID });
              }}
              onError={(err) => console.error("Card payment error:", err)}
            />
          </PayPalScriptProvider>

          {loading && (
            <div className="mt-4 text-blue-600 font-semibold">
              Processing payment, please wait...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
