import React, { useEffect, useRef, useState } from "react";
import api from "../../../../../../../Services/Api";
import { Input } from "../../../../../../../../components/ui/input";
import { useLocation, useNavigate } from "react-router-dom";
import MpesaLogo from "../../../../../../../assets/partnaship/mpesaLogo.png";

export default function MpesaSTKPayment() {
  const location = useLocation();
  const navigate = useNavigate();
  const checkoutResult = location.state || null;
  const checkoutId = checkoutResult?.checkout_id || null;
  const amount = Number(checkoutResult?.payment?.amount || 0);
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [snackbar, setSnackbar] = useState({ open: false, severity: "info", text: "" });
  const pollingRef = useRef(null);

  useEffect(() => {
    if (checkoutResult?.checkout_id) {
      sessionStorage.setItem("maaMaraCheckout", JSON.stringify(checkoutResult));
    }
  }, [checkoutResult]);

  const showSnackbar = (text, severity = "info") => setSnackbar({ open: true, severity, text });

  const stopPolling = () => {
    if (pollingRef.current) {
      window.clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  };

  const checkPaymentStatus = async () => {
    if (!checkoutId) return;
    try {
      const response = await api.get(`/api/checkout/${checkoutId}/status/`);
      const data = response.data;
      if (data.status === "completed" && data.order_id) {
        stopPolling();
        sessionStorage.removeItem("maaMaraBuyNow");
        sessionStorage.removeItem("maaMaraCheckout");
        navigate("/payment-success", {
          state: { order: { id: data.order_id, status: "completed", payment_method: data.payment_method, amount: data.amount } },
        });
      } else if (data.status === "failed" || data.status === "expired") {
        stopPolling();
        setLoading(false);
        setMessage("The payment was not completed. Please try again.");
        showSnackbar("M-Pesa payment was not completed.", "error");
      }
    } catch {
      // Keep polling; a transient status request failure should not cancel payment.
    }
  };

  const startPolling = () => {
    stopPolling();
    pollingRef.current = window.setInterval(checkPaymentStatus, 3000);
  };

  useEffect(() => () => stopPolling(), []);

  const handlePayment = async (event) => {
    event.preventDefault();
    if (!checkoutId) {
      showSnackbar("Checkout information is missing. Please return to checkout.", "error");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const response = await api.post("/api/mpesa/stk-push/", { checkout_id: checkoutId, phone });
      setMessage(response.data?.message || "STK Push sent. Complete the payment on your phone.");
      showSnackbar("STK Push sent. Complete the payment on your phone.", "success");
      startPolling();
    } catch (error) {
      setLoading(false);
      showSnackbar(
        error?.response?.data?.error || "Unable to start the M-Pesa payment. Please try again.",
        "error"
      );
    }
  };

  return (
    <main className="mm-payment-page min-h-screen px-4 py-8 md:px-6 md:py-12">
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.text}
          <button type="button" onClick={() => setSnackbar((current) => ({ ...current, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button>
        </div>
      )}
      <div className="mm-container">
        <div className="mx-auto mb-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Secure checkout</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">Pay with M-Pesa</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">Complete your payment securely using M-Pesa.</p>
        </div>
        <section className="mm-payment-card">
          <div className="mb-6 flex justify-center rounded-xl border border-border bg-background p-4">
            <img src={MpesaLogo} alt="M-Pesa" className="max-h-24 w-auto object-contain" />
          </div>
          <form onSubmit={handlePayment} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-card-foreground">Phone number</label>
              <Input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="e.g. 254712345678" className="w-full" required />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-5">
              <span className="text-sm font-semibold text-muted-foreground">Amount</span>
              <span className="text-xl font-bold text-card-foreground">KES {amount.toLocaleString()}</span>
            </div>
            <button type="submit" disabled={loading} className="primary-button mm-button-full flex w-full items-center justify-center rounded-full px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
              {loading ? "Waiting for payment..." : "Pay Now"}
            </button>
          </form>
          {message && <p className="mt-4 text-center text-sm font-medium text-muted-foreground">{message}</p>}
          <p className="mt-6 flex items-center justify-center gap-2 border-t border-border pt-4 text-xs text-muted-foreground">Secure payment</p>
        </section>
      </div>
    </main>
  );
}
