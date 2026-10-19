import React, { useState, useEffect } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Grid,
} from "@mui/material";
import api, { getWebSocketUrl } from "../../../../Services/Api";
import { useLocation, useNavigate } from "react-router-dom";
import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import "../payout-workflows.css";
import AppSnackbar from "../../../../../components/ui/app-snackbar";

export default function MpesaB2CMultiPayment({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();

  const prefilledPayments = location.state?.payments || [];

  const [payments, setPayments] = useState(
    prefilledPayments.map((p) => ({
      vendor: p.vendor?.company_name || p.vendor?.name || p.vendor_name || [p.vendor?.first_name, p.vendor?.middle_name, p.vendor?.surname_name].filter(Boolean).join(" ") || "Unknown Vendor",
      mpesaType: (() => { const raw = String(p.vendor?.mpesa_type || p.mpesa_type || "PHONE").toUpperCase(); return raw === "PAYBILL" ? "LIPA_NA_MPESA" : raw === "BUY_GOODS" ? "TILL" : raw === "PHONE_NUMBER" || raw === "MSISDN" ? "PHONE" : raw; })(),
      phone: p.vendor?.mpesa_number || p.vendor?.MpesaNo || p.vendor?.mpesa_no || p.mpesa_number || p.phone || "",
      till: p.vendor?.mpesa_till || p.mpesa_till || "",
      paybill: p.vendor?.mpesa_paybill || p.mpesa_paybill || "",
      amount: p.amount ?? "",
      reference: p.reference || "",
    }))
  );

  useEffect(() => {
    const vendorPayouts = location.state?.payments || [];

    if (!vendorPayouts || vendorPayouts.length === 0) return;

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

          if (data.status === "success" || data.status === "completed") {
            navigate("/admin-dashboard/vendor-payout/payment-trigger", { state: { payout: data } });
          }

          if (data.status === "failed") {
            navigate("/admin-dashboard/vendor-payout/payment-trigger", { state: { payout: data } });
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
      const { mpesaType, phone, till, paybill, amount } = payments[i];
      const destination = mpesaType === "TILL" ? till : mpesaType === "LIPA_NA_MPESA" ? paybill : phone;
      const normalizedPhone = normalizePhone(phone);

      if (!destination || !amount) {
        showSnackbar(`⚠️ Missing M-Pesa destination or amount at row ${i + 1}.`);
        setError(`⚠️ Missing M-Pesa destination or amount at row ${i + 1}.`);
        return false;
      }

      if (mpesaType === "PHONE" && !/^2547\d{8}$/.test(normalizedPhone)) {
        showSnackbar(`⚠️ Invalid phone format at row ${i + 1}. Use 2547XXXXXXXX.`);
        setError(`⚠️ Invalid phone format at row ${i + 1}. Use 2547XXXXXXXX.`);
        return false;
      }

      if ((mpesaType === "TILL" || mpesaType === "LIPA_NA_MPESA") && !/^\d{5,20}$/.test(String(destination).replace(/\D/g, ""))) {
        showSnackbar(`⚠️ Invalid Till/Paybill number at row ${i + 1}.`);
        setError(`⚠️ Invalid Till/Paybill number at row ${i + 1}.`);
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
      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />

      <Box className="mm-payout-page" sx={{ px: 2, py: { xs: 1, sm: 2 }, maxWidth: 1100, mx: "auto", width: "100%" }}>
        <Box
          sx={{
            borderRadius: "12px",
            p: { xs: 2, sm: 3 },
            mt: 1,
            backgroundColor: "var(--card, #fff)",
            color: "var(--card-foreground, var(--foreground, #222))",
            border: "1px solid var(--border, #e6e6e4)",
            boxShadow: "0 4px 14px rgba(0,0,0,.06)",
          }}
          className="mm-payout-shadow"
        >
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            M-Pesa B2C Bulk Payment
          </Typography>

          <div className="mm-payout-logo-row mm-payout-logo-row--compact">
            <img src={MpesaLogo} alt="mpesalog.png" className="mm-payout-logo-image mm-payout-logo-image--cover" />
          </div>

          <Grid container spacing={2} sx={{ fontWeight: "bold", mb: 1, display: { xs: "none", sm: "flex" } }}>
            <Grid item sm={4}>
              Vendor
            </Grid>
            <Grid item sm={4}>Registered M-Pesa destination</Grid>
            <Grid item sm={4}>Amount (KES)</Grid>
          </Grid>

          {payments.map((payment, index) => (
            <Grid
              container
              spacing={1.5}
              alignItems="center"
              key={payment.reference || index}
              sx={{ mb: 2, p: { xs: 1.5, sm: 2 }, border: "1px solid var(--border, #e6e6e4)", borderRadius: "16px" }}
            >
              <Grid item xs={12} sm={4}>
                <TextField
                  label="Vendor"
                  value={payment.vendor}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                  size="small"
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  label={payment.mpesaType === "TILL" ? "M-Pesa Till number" : payment.mpesaType === "LIPA_NA_MPESA" ? "M-Pesa Paybill number" : "M-Pesa phone number"}
                  value={(payment.mpesaType === "TILL" ? payment.till : payment.mpesaType === "LIPA_NA_MPESA" ? payment.paybill : payment.phone) || "Not provided"}
                  fullWidth
                  InputProps={{ readOnly: true }}
                  variant="outlined"
                  size="small"
                  helperText={payment.mpesaType === "TILL" ? "Registered Till destination" : payment.mpesaType === "LIPA_NA_MPESA" ? "Registered Paybill destination" : "Registered phone destination"}
                />
              </Grid>

              <Grid item xs={12} sm={4}>
                <TextField
                  type="number"
                  label="Payout amount (KES)"
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
                backgroundColor: "var(--primary-hover, #1d4ed8)",
                border: "none",
              },
              py: 1.2,
              mt: 3,
              borderRadius: "20px",
              textTransform: "none",
              fontWeight: 700,
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
