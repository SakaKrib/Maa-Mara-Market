import React, { useState, useEffect } from "react";
import api from "../../../../../../../Services/Api";
import { useCartContext } from "../../CartHook/cart";
import { IonIcon } from "@ionic/react";
import { lockClosed } from "ionicons/icons";
import MpesaLogo from "../../../../../../../assets/partnaship/mpesaLogo.png";
import { Input } from "../../../../../../../../components/ui/input";
import { Button } from "../../../../../../../../components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";

export default function MpesaSTKPayment() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0); // number internally
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const { order: cartOrder } = useCartContext();
  const location = useLocation();
  const order = location.state?.order || location.state || cartOrder;
  const navigate = useNavigate()

  // Auto-set amount from cart
  useEffect(() => {
    if (order?.order?.total) {
      const total = Number(order.order.final_total);
      setAmount(isNaN(total) ? 0 : total);
    }
  }, [order]);


  useEffect(() => {
    if (!order?.order?.id) return; // wait until we have a valid order ID
  
    const orderId = order.order.id; // ✅ define it here#78b981
    
  
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsScheme}://127.0.0.1:8000/ws/orders/${order.order.id}/`);

  
    socket.onopen = () => {
      console.log(`✅ WebSocket connected to order ${orderId}`);
    };
  
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📦 WebSocket message:", data);
  
        if (data.status === "completed") {
          navigate(`/payment-success`, {
            state: { order: order.order }, // ✅ carry full order object
          });
        }
      } catch (error) {
        console.error("❌ Error parsing WebSocket message:", error);
      }
    };
  
    socket.onerror = (error) => {
      console.error("⚠️ WebSocket error:", error);
    };
  
    socket.onclose = () => {
      console.log(`🔌 WebSocket closed for order ${orderId}`);
      console.log(`🔌 WebSocket closed for order ${orderId}`, event);
    };
  
    // Cleanup
    return () => socket.close();
  }, [order?.order?.id, navigate]);
  
  

  const handlePayment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
  
    try {
      if (!order?.order?.id) {
        setMessage("❌ No order found. Please create an order first.");
        setLoading(false);
        return;
      }
  
      const response = await api.post(
        "/api/mpesa/stk-push/",
        {
          phone,
          amount: Math.floor(amount), // integer
          order_id: order.order.id,   // ✅ send order ID to backend
        },
        { withCredentials: true }
      );
  
      if (response.data) {
        setMessage(
          "✅ STK Push sent! Check your phone to enter your PIN and complete payment."
        );
      }
    } catch (err) {
      console.error("STK Push error:", err);
      setMessage("❌ Payment failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Format KES with commas for display
  const formatAmount = (val) =>
    new Intl.NumberFormat("en-KE", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val || 0);

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      {/* Header / Logo */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between border-b border-gray-300 logo">
        <a href="#" className="flex items-center space-x-2 text-2xl font-bold text-gray-800">
          <span className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
            MMM
          </span>
          <span>
            Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span>
          </span>
        </a>
        <span className="font-semibold hover:underline cursor-pointer">Go to Shop</span>
      </div>

      {/* Payment Card */}
      <div className="flex flex-1 items-center justify-center p-6 flex-col">
        <div className="bg-white p-6 rounded-2xl shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold text-center mb-6">Pay with M-Pesa</h2>
          {/* mpesa logo */}
          <div className="flex justify-center mb-10">
            <img
              src={MpesaLogo} // <-- replace with your logo path or URL
              alt="M-Pesa"
              className="w-full h-auto"
            />
          </div>

          <form onSubmit={handlePayment} className="space-y-8">
            {/* Phone Number */}
            <div>
              <label className="block text-sm font-medium">Phone Number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 254712345678"
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                required
              />
            </div>

            {/* Amount (auto-filled from order) */}
            <div className="flex items-center ">
              <label className="block text-sm font-medium w-full">Amount (KES)</label>
              <div className="flex font-semibold">
              <Input
                type="text"
                value={formatAmount(amount)}
                readOnly
                className="w-full px-4 py-2 border rounded-lg cursor-not-allowed border-none justify-center flex"
                style={{fontSize:'1.4em'}}
              />/-
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-700 text-white py-2 rounded-lg hover:bg-green-600 transition"
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </form>

          {message && (
            <div className="mt-4 text-center text-sm font-medium">
              {message}
            </div>
          )}
        </div>
        <p className="mt-4 flex gap-2 text-gray-500">
          <IonIcon icon={lockClosed} />
          Secure payment
        </p>
      </div>
    </div>
  );
}
