import React, { useState, useEffect } from "react";
import api from "../../../../../../../Services/Api";
import { useCartContext } from "../../CartHook/cart";
import { IonIcon } from "@ionic/react";
import { lockClosed } from "ionicons/icons";
import MpesaLogo from "../../../../../../../assets/partnaship/mpesaLogo.png";
import { Input } from "../../../../../../../../components/ui/input";
import { Button } from "../../../../../../../../components/ui/button";
import { useLocation, useNavigate } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

export default function MpesaSTKPayment() {
  const [phone, setPhone] = useState("");
  const [amount, setAmount] = useState(0); // number internally
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, severity: "info", text: "" });
  const showSnackbar = (text, severity = "info") => setSnackbar({ open: true, severity, text });
  const { order } = useCartContext();
  const location = useLocation();
  const navigate = useNavigate();
  const checkoutResult = location.state || null;
  const paymentOrderId = checkoutResult?.order_id || order?.order?.id || null;
  const paymentAmount = checkoutResult?.payment?.amount ?? order?.order?.final_total ?? order?.order?.total ?? 0;

  // Auto-set amount from cart
  useEffect(() => {
    const total = Number(paymentAmount);
    setAmount(Number.isFinite(total) ? total : 0);
  }, [paymentAmount, order]);


  useEffect(() => {
    if (!paymentOrderId) return;
    const orderId = paymentOrderId; // ✅ define it here#78b981
    
  
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
const socket = new WebSocket(`${wsScheme}://127.0.0.1:8000/ws/orders/${paymentOrderId}/`);

  
    socket.onopen = () => {
      console.log(`✅ WebSocket connected to order ${orderId}`);
    };
  
    socket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log("📦 WebSocket message:", data);
  
        if (data.status === "completed") {
          navigate(`/payment-success`, {
            state: { order: checkoutResult || order?.order }, // carry checkout result for Buy Now and cart checkout
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

    };
  
    // Cleanup
    return (
    <main className="mm-payment-page min-h-screen px-4 py-8 md:px-6 md:py-12">
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        >
          {snackbar.text}
        </Alert>
      </Snackbar>

      <div className="mm-container">
        <div className="mx-auto mb-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secure checkout</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">Pay with M-Pesa</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Complete your payment securely using M-Pesa.
          </p>
        </div>

        <section className="mm-payment-card">
          <div className="mb-6 flex justify-center rounded-xl border border-border bg-background p-4">
            <img src={MpesaLogo} alt="M-Pesa" className="max-h-24 w-auto object-contain" />
          </div>

          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-card-foreground">Phone number</label>
              <Input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 254712345678"
                className="w-full"
                required
              />
            </div>

            <div className="flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm font-semibold text-muted-foreground">Amount</span>
              <span className="text-xl font-bold text-card-foreground">KES {formatAmount(amount)}</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="primary-button mm-button-full flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Processing..." : "Pay Now"}
            </button>
          </form>

          {message && (
            <p className="mt-4 text-center text-sm font-medium text-muted-foreground">{message}</p>
          )}

          <p className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">
            <IonIcon icon={lockClosed} />
            Secure payment
          </p>
        </section>
      </div>
    </main>
  );
}