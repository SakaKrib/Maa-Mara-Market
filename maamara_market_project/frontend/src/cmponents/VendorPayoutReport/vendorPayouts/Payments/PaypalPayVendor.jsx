import React, { useMemo, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import api, { getWebSocketUrl } from "../../../../Services/Api";
import { tokens } from "../../../../theme";
import "../payout-workflows.css";
import { useNavigate } from "react-router-dom";
import AppSnackbar from "../../../../../components/ui/app-snackbar";

export default function PaypalBulkPayment({ onSuccess }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const navigate = useNavigate()

  const location = useLocation(); // <-- Add this

  const singlePayout = useMemo(
    () =>
      location.state?.reference
        ? {
            vendor: location.state?.vendor || {},
            amount: location.state?.amount ?? "",
            payment_method: "PAYPAL",
            reference: location.state.reference,
          }
        : null,
    [location.state?.reference, location.state?.vendor, location.state?.amount]
  );

  const vendorPayouts = useMemo(
    () => location.state?.payments || (singlePayout ? [singlePayout] : []),
    [location.state?.payments, singlePayout]
  );

  const [payments, setPayments] = useState(() => {
    if (vendorPayouts.length > 0) {
      return vendorPayouts.map((p) => ({
        vendor_name: p.vendor?.company_name || [p.vendor?.first_name, p.vendor?.middle_name, p.vendor?.surname_name].filter(Boolean).join(" ") || "",
        email: p.vendor?.paypal_email || p.vendor?.PaypalEmail || "",
        payment_method: p.vendor?.payment_method || "PAYPAL",
        amount: p.amount ?? "",
        reference: p.reference || "",
      }));
    }
    return [{ vendor_name: "", email: "", amount: 0, reference: "" }];
  });

  // ... rest of your component code unchanged

  // websockets
  useEffect(() => {
    // vendorPayouts come from location.state.payments
    if (!vendorPayouts || vendorPayouts.length === 0) return;
  
    // open 1 socket per payout reference
    const sockets = vendorPayouts.map((p) => {
      if (!p.reference) return null;
  
      const socket = new WebSocket(
        getWebSocketUrl(`/ws/payout/${p.reference}/`)
      );
  
      socket.onopen = () => {
      };
  
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
  
          const status = String(
            data?.status || data?.data?.status || ""
          ).toLowerCase();

          if (status === "success" || status === "completed") {
            navigate(
              "/admin-dashboard/vendor-payout/payment-trigger",
              { state: { payout: data } }
            );
          }

          if (status === "failed") {
            navigate(
              "/admin-dashboard/vendor-payout/payment-trigger",
              { state: { payout: data } }
            );
          }
        } catch (err) {
          console.error("❌ WebSocket parse error:", err);
        }
      };
  
      socket.onerror = (error) => {
        console.error(`⚠️ WebSocket error for ${p.reference}:`, error);
      };
  
      socket.onclose = () => {
      };
  
      return socket;
    });
  
    return () => {
      sockets.forEach((socket) => socket?.close());
    };
  }, [vendorPayouts]);
  
  



  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const handleChange = (index, field, value) => {
    const updated = [...payments];
    updated[index][field] = value;
    setPayments(updated);
  };

  const addPaymentRow = () => {
    setPayments([
      ...payments,
      { vendor_name: "", email: "", amount: 0, reference: "" },
    ]);
  };

  const removePaymentRow = (index) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const validatePayments = () => {
    for (let i = 0; i < payments.length; i++) {
      const { vendor_name, email, amount } = payments[i];

      if (!vendor_name || !email || !amount) {
        showSnackbar(`⚠️ Missing fields in row ${i + 1}`);
        setError(`⚠️ Missing fields in row ${i + 1}`);
        return false;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(email)) {
        showSnackbar(`⚠️ Invalid email format at row ${i + 1}`);
        setError(`⚠️ Invalid email format at row ${i + 1}`);
        return false;
      }

      if (isNaN(amount) || Number(amount) <= 0) {
        showSnackbar(`⚠️ Invalid amount at row ${i + 1}`);
        setError(`⚠️ Invalid amount at row ${i + 1}`);
        return false;
      }
    }

    setError(null);
    return true;
  };

  const handlePayment = async () => {
    if (!validatePayments()) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      if (singlePayout?.reference) {
        const response = await api.post(
          `/api/vendor/payout/${encodeURIComponent(singlePayout.reference)}/pay/`
        );
        setMessage(
          response.data?.message ||
            "PayPal payout submitted; awaiting provider confirmation."
        );
        showSnackbar(
          response.data?.message ||
            "PayPal payout submitted; awaiting provider confirmation."
        );
        if (onSuccess) onSuccess(response.data);
        return;
      }

      await api.post("/api/payout/process-payouts-by-group/", {
        payment_method: "PAYPAL",
        payments,
      });

      setMessage("✅ All vendor PayPal payouts processed successfully.");
      showSnackbar("✅ All vendor PayPal payouts processed successfully.");
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || "Something went wrong during PayPal payout.";
      setError(errorMessage);
      showSnackbar(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />
      <Box className="mm-payout-page" sx={{ p: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto", width: "100%" }}>
      <Box
        sx={{
          borderRadius: "20px",
          p: { xs: 2, sm: 3 },
          mt: 1,
          backgroundColor: "var(--mm-surface, var(--background, #fff))",
          color: "var(--mm-foreground, var(--foreground, #222))",
          border: "1px solid var(--mm-border, var(--border, #e5e7eb))",
          boxShadow: "0 4px 14px rgba(0,0,0,.06)",
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          PayPal Bulk Payment
        </Typography>

        <Grid container spacing={2} sx={{ fontWeight: "bold", mb: 1, display: { xs: "none", md: "flex" } }}>
          <Grid item md={3}>
            Vendor Name
          </Grid>
          <Grid item xs={3}>
            Email
          </Grid>
          <Grid item xs={3}>
            Amount (KES → USD)
          </Grid>
          <Grid item xs={3}>
            Actions
          </Grid>
        </Grid>

        {payments.map((payment, index) => (
          <Grid
            container
            spacing={2}
            alignItems="center"
            key={index}
            sx={{ mb: 1 }}
          >
            <Grid item xs={3}>
              <TextField
                value={payment.vendor_name}
                onChange={(e) =>
                  handleChange(index, "vendor_name", e.target.value)
                }
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading || vendorPayouts?.length > 0}
                placeholder="Vendor Name"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                label="Saved PayPal account email"
                value={payment.email}
                onChange={(e) => handleChange(index, "email", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading || vendorPayouts?.length > 0}
                placeholder="Vendor PayPal email"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                type="number"
                value={payment.amount}
                onChange={(e) => handleChange(index, "amount", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading}
                inputProps={{ min: 0, step: "0.01" }}
              />
            </Grid>

            <Grid item xs={3}>
              <Button
                variant="outlined"
                color="error"
                size="small"
                onClick={() => removePaymentRow(index)}
                disabled={loading || payments.length === 1}
              >
                Remove
              </Button>
            </Grid>
          </Grid>
        ))}

        <Button
          variant="text"
          onClick={addPaymentRow}
          disabled={loading}
          sx={{ mt: 2, borderRadius: "20px", textTransform: "none" }}
        >
          + Add another payment
        </Button>

        <Button
          variant="contained"
          className="mm-payout-rounded-control"
          onClick={handlePayment}
          disabled={loading}
          fullWidth
          sx={{
            backgroundColor: colors.greenAccent[500],
            "&:hover": { backgroundColor: colors.greenAccent[600] },
            py: 1.2,
            mt: 3,
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Send All Payments"}
        </Button>
      </Box>
    </Box>
    </>
  );
}
