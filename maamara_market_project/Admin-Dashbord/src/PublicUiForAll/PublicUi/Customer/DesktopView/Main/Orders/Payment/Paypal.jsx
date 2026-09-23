import { PayPalScriptProvider, PayPalButtons, FUNDING } from "@paypal/react-paypal-js";
import { useCartContext } from "../../CartHook/cart";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import api from "../../../../../../../Services/Api";

export default function CheckoutPaypalPayment() {
  const clientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  if (!clientId) throw new Error("SDK Validation error: 'Expected client-id to be passed'");

  const { order } = useCartContext();
  const location = useLocation();
  const checkoutResult = location.state || null;
  const checkoutId = checkoutResult?.checkout_id || null;
  const paypalOrderId = checkoutResult?.paypal_order_id || null;
  const kesAmount = Number(
    checkoutResult?.payment?.amount ??
      order?.order?.final_total ??
      order?.order?.total ??
      0
  );
  const [usdAmount] = useState(
    String(checkoutResult?.payment?.provider_amount ?? "0.01")
  );
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "info",
    text: "",
  });
  const showSnackbar = (text, severity = "info") =>
    setSnackbar({ open: true, severity, text });
  const navigate = useNavigate();

  const handlePaymentApproval = async ({ id }) => {
    if (!id || !checkoutId) {
      showSnackbar("PayPal order information is missing. Please return to checkout.", "error");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post(`/api/paypal/capture/${id}/`, {
        checkout_id: checkoutId,
      });

      if (response.data?.status === "ok") {
        navigate("/payment-success", {
          state: {
            order: response.data?.order || checkoutResult || order?.order,
          },
        });
        return;
      }

      showSnackbar(
        response.data?.message || "PayPal payment could not be completed.",
        "error"
      );
    } catch (error) {
      showSnackbar(
        error?.response?.data?.message ||
          "PayPal payment could not be completed. Please try again.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  };



  return (
    <main className="mm-payment-page min-h-screen px-4 py-8 md:px-6 md:py-12">
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() =>
          setSnackbar((current) => ({ ...current, open: false }))
        }
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          severity={snackbar.severity}
          variant="filled"
          onClose={() =>
            setSnackbar((current) => ({ ...current, open: false }))
          }
        >
          {snackbar.text}
        </Alert>
      </Snackbar>

      <div className="mm-container">
        <div className="mx-auto mb-6 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Secure checkout
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">
            Pay with PayPal
          </h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose PayPal or card to complete your order.
          </p>
        </div>

        <section className="mm-payment-card">
          <div className="mb-6 flex items-center justify-between border-b border-border pb-5">
            <span className="text-sm font-semibold text-muted-foreground">
              Order total
            </span>
            <span className="text-xl font-bold text-card-foreground">
              KES {kesAmount.toLocaleString()}{" "}
              <span className="text-sm font-medium text-muted-foreground">
                ≈ USD {usdAmount}
              </span>
            </span>
          </div>

          <PayPalScriptProvider
            options={{ "client-id": clientId, currency: "USD" }}
          >
            <div className="space-y-3">
              <PayPalButtons
                fundingSource={FUNDING.PAYPAL}
                style={{
                  layout: "vertical",
                  color: "blue",
                  shape: "pill",
                  label: "paypal",
                  height: 45,
                }}
                createOrder={() => {
                  if (!paypalOrderId)
                    throw new Error("Missing PayPal order ID from checkout.");
                  return paypalOrderId;
                }}
                onApprove={async (data) => {
                  if (!loading) await handlePaymentApproval({ id: data.orderID });
                }}
                onError={(err) => {
                  showSnackbar(
                    "PayPal payment could not be started. Please try again.",
                    "error"
                  );
                }}
              />

              <PayPalButtons
                fundingSource={FUNDING.CARD}
                style={{
                  layout: "vertical",
                  color: "black",
                  shape: "pill",
                  label: "pay",
                  height: 45,
                }}
                createOrder={() => {
                  if (!paypalOrderId)
                    throw new Error("Missing PayPal order ID from checkout.");
                  return paypalOrderId;
                }}
                onApprove={async (data) => {
                  if (!loading) await handlePaymentApproval({ id: data.orderID });
                }}
                onError={(err) => {
                  showSnackbar(
                    "Card payment could not be started. Please try again.",
                    "error"
                  );
                }}
              />
            </div>
          </PayPalScriptProvider>

          {loading && (
            <div className="mt-5 border-t border-border pt-4 text-center text-sm font-semibold text-muted-foreground">
              Processing payment, please wait...
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
