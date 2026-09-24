import React, { useState, useEffect } from "react";
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
import { useLocation, useNavigate } from "react-router-dom";
import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";

export default function MpesaB2CMultiPayment({ onSuccess }) {
  const location = useLocation();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  const prefilledPayments = location.state?.payments || [];
  console.log("Fetched Payments:", prefilledPayments);

  const [payments, setPayments] = useState(
    prefilledPayments.map((p) => ({
      vendor: p.vendor.company_name || p.vendor.name || "Unknown Vendor",
      phone: p.vendor?.MpesaNo || "",
      amount: p.amount || 0,
      reference: p.reference || "",
    }))
  );

  useEffect(() => {
    const vendorPayouts = location.state?.payments || [];

    if (!vendorPayouts || vendorPayouts.length === 0) return;

    const wsScheme = window.location.protocol === "https:" ? "wss" : "ws";

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

    return () => {
      sockets.forEach((socket) => socket?.close());
    };
  }, [location.state?.payments, navigate]);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(
      () => setSnackbar((prev) => ({ ...prev, open: false })),
      3000
    );
  };

  const normalizePhone = (phone) => {
    if (!phone) return "";
    let p = phone.replace(/\D/g, "");

    if (p.startsWith("07")) return "254" + p.slice(1);
    if (p.startsWith("7")) return "254" + p;
    if (p.startsWith("+254")) return p.replace("+", "");
    if (p.startsWith("254")) return p;

    return p;
  };

  const handleChange = (index, field, value) => {
    const updated = [...payments];
    if (field === "phone") {
      updated[index][field] = normalizePhone(value);
    } else {
      updated[index][field] = value;
    }
    setPayments(updated);
  };

  const validatePayments = () => {
    for (let i = 0; i < payments.length; i++) {
      const { phone, amount } = payments[i];
      const normalizedPhone = normalizePhone(phone);

      if (!normalizedPhone || !amount) {
        showSnackbar(`⚠️ Please enter phone and amount for row ${i + 1}.`);
        setError(`⚠️ Please enter phone and amount for row ${i + 1}.`);
        return false;
      }

      if (!/^2547\d{8}$/.test(normalizedPhone)) {
        showSnackbar(`⚠️ Invalid phone format at row ${i + 1}. Use 2547XXXXXXXX.`);
        setError(`⚠️ Invalid phone format at row ${i + 1}. Use 2547XXXXXXXX.`);
        return false;
      }

      if (isNaN(amount) || Number(amount) <= 0) {
        showSnackbar(`⚠️ Invalid amount at row ${i + 1}.`);
        setError(`⚠️ Invalid amount at row ${i + 1}.`);
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
      const res = await api.post("/api/payout/process-payouts-by-group/", {
        payment_method: "MOBILE_MONEY",
        payments,
      });

      setMessage("✅ All vendor M-Pesa payouts processed successfully.");
      showSnackbar("✅ All vendor M-Pesa payouts processed successfully.");
      console.log("Payment Response:", res.data);
      if (onSuccess) onSuccess();
    } catch (err) {
      console.error(err);
      const errorMessage =
        err.response?.data?.error || "Something went wrong during payment.";
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
          className="shadow"
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            M-Pesa B2C Bulk Payment
          </Typography>

          <div className="w-full flex justify-center h-[100px] mb-4">
            <img src={MpesaLogo} alt="mpesalog.png" className="object-cover" />
          </div>

          <Grid container spacing={25} sx={{ fontWeight: "bold", mb: 1 }}>
            <Grid item xs={4}>
              Vendor
            </Grid>
            <Grid item xs={4}>
              Phone
            </Grid>
            <Grid item xs={4}>
              Amount (KES)
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
              <Grid item xs={4}>
                <TextField
                  value={payment.vendor}
                  fullWidth
                  disabled
                  variant="outlined"
                  size="small"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  value={payment.phone}
                  onChange={(e) => handleChange(index, "phone", e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={loading}
                  placeholder="2547XXXXXXXX"
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  type="number"
                  value={payment.amount}
                  onChange={(e) => handleChange(index, "amount", e.target.value)}
                  fullWidth
                  variant="outlined"
                  size="small"
                  disabled={loading}
                />
              </Grid>
            </Grid>
          ))}

          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={loading}
            fullWidth
            sx={{
              "&:hover": {
                backgroundColor: colors.greenAccent[600],
                border: "none",
              },
              py: 1.2,
              mt: 3,
              borderRadius: "50px",
              border: "1px solid",
            }}
          >
            {loading ? <CircularProgress size={24} /> : "Send All Payments"}
          </Button>
        </Box>
      </Box>
    </>
  );
}
