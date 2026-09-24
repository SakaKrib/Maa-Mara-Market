import React, { useState, useEffect } from "react";
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
import api from "../../../../Services/Api";
import { tokens } from "../../../../theme";
import { useNavigate } from "react-router-dom";

export default function PaypalBulkPayment({ onSuccess }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const navigate = useNavigate()

  const location = useLocation(); // <-- Add this

  const vendorPayouts = location.state?.payments || [];

  const [payments, setPayments] = useState(() => {
    if (vendorPayouts.length > 0) {
      return vendorPayouts.map((p) => ({
        vendor_name: p.vendor?.company_name || "",
        email: p.vendor?.PaypalEmail || p.vendor?.email || "",
        amount: p.amount || 0,
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
  
    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";
  
    // open 1 socket per payout reference
    const sockets = vendorPayouts.map((p) => {
      if (!p.reference) return null;
  
      const socket = new WebSocket(
        `${wsScheme}://127.0.0.1:8000/ws/payout/${p.reference}/`
      );
  
      socket.onopen = () => {
        console.log(`🔗 WebSocket connected → payout ${p.reference}`);
      };
  
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log("💸 Payout WebSocket:", data);
  
          if (data.status === "success" || data.status === "completed") {
            navigate(`/payout-success`, { state: { payout: data } });
          }
  
          if (data.status === "failed") {
            navigate(`/payout-failed`, { state: { payout: data } });
          }
        } catch (err) {
          console.error("❌ WebSocket parse error:", err);
        }
      };
  
      socket.onerror = (error) => {
        console.error(`⚠️ WebSocket error for ${p.reference}:`, error);
      };
  
      socket.onclose = () => {
        console.log(`🔌 WebSocket closed → payout ${p.reference}`);
      };
  
      return socket;
    });
  
    return (
    <>
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.message}
          <button
            type="button"
            onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
) => {
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
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.message}
          <button
            type="button"
            onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
      <Box sx={{ p: 6 }}>
      <Box
        sx={{
          borderRadius: 3,
          p: 4,
          mt: 2,
          backgroundColor: colors.primary[800],
          color: colors.gray[100],
          boxShadow: 3,
        }}
      >
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          PayPal Bulk Payment
        </Typography>

        <Grid container spacing={10} sx={{ fontWeight: "bold", mb: 1 }}>
          <Grid item xs={3}>
            Vendor Name
          </Grid>
          <Grid item xs={3}>
            Email
          </Grid>
          <Grid item xs={3}>
            Amount (USD)
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
                disabled={loading || vendorPayouts?.length > 0} // disable editing if loaded
                placeholder="Vendor Name"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                value={payment.email}
                onChange={(e) => handleChange(index, "email", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading}
                placeholder="recipient@example.com"
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
          sx={{ mt: 2 }}
        >
          + Add another payment
        </Button>

        <Button
          variant="contained"
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
