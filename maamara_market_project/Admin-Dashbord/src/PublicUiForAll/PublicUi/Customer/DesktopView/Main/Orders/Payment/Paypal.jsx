import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { useCartContext } from "../../CartHook/cart";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export default function CheckoutPaypalPayment() {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("SDK Validation error: 'Expected client-id to be passed'");

  const { order } = useCartContext();
  const location = useLocation();
  const checkoutResult = location.state || null;
  const localOrderId = checkoutResult?.order_id || order?.order?.id || null;
  const paypalOrderId = checkoutResult?.paypal_order_id || null;
  const kesAmount = Number(checkoutResult?.payment?.amount ?? order?.order?.final_total ?? order?.order?.total ?? 0);
  const [usdAmount, setUsdAmount] = useState(String(checkoutResult?.payment?.provider_amount ?? "0.01"));
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // --- WebSocket for real-time payment status ---
  useEffect(() => {
    if (!localOrderId) return;
    const orderId = localOrderId;
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
  }, [localOrderId, navigate]);

  // --- Convert KES to USD ---
  useEffect(() => {
    async function convertKES() {
      try {
        const res = await fetch(
          `https://api.exchangerate.host/convert?from=KES&to=USD&amount=${kesAmount}`
        );
        const data = await res.json();
        setUsdAmount(data?.result ? Number(data.result).toFixed(2) : (kesAmount / 150).toFixed(2));
      } catch {
        setUsdAmount((kesAmount / 150).toFixed(2));
      }
    }
    if (kesAmount > 0 && !checkoutResult?.payment?.provider_amount) convertKES();
  }, [kesAmount, checkoutResult?.payment?.provider_amount]);

  const handlePaymentApproval = async (details) => {
    setLoading(true);
    try {
      console.log("💳 PayPal payment approved:", details);

      const providerOrderId = details.id || paypalOrderId;
      if (!providerOrderId || !localOrderId) throw new Error("Missing PayPal or local order reference.");
      const response = await fetch(
        `/api/paypal/capture/${providerOrderId}/`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ref_order_id: localOrderId,
           
          }),
          credentials: "include",
        }
      );

      const data = await response.json();
      console.log("✅ Payment verified by backend:", data);

      // Treat "already captured" as successful
      if (data.status === "ok" && (data.message === "Capture attempted" || data.message === "Order already captured")) {
      setLoading(false);

        navigate(`/payment-success`, { state: { order: order.order } });
      } else {
        console.error("❌ Backend capture failed:", data);
      setLoading(false);

        alert("Payment failed. Please contact support.");
      }
    } catch (error) {
      console.error("❌ Failed to capture payment:", error);
      setLoading(false);
      alert("Payment failed. Please try again.");

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
          Choose a payment option (KES {kesAmount} ≈ USD {usdAmount})
        </h2>

        <div className="w-full max-w-xs mx-auto mt-10">
          <PayPalScriptProvider options={{ "client-id": clientId, currency: "USD" }}>
            {/* --- PayPal Wallet Button --- */}
            <PayPalButtons
              fundingSource={FUNDING.PAYPAL}
              style={{ layout: "vertical", color: "blue", shape: "pill", label: "paypal", height: 45 }}
              createOrder={() => {
                if (!paypalOrderId) throw new Error("Missing PayPal order ID from checkout.");
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
                if (!paypalOrderId) throw new Error("Missing PayPal order ID from checkout.");
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
