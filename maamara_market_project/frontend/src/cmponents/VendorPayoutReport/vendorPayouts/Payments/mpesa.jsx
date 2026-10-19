import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  TextField,
  Typography
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import api, { getWebSocketUrl } from "../../../../Services/Api";
import "../payout-workflows.css";
import AppSnackbar from "../../../../../components/ui/app-snackbar";

export default function MpesaB2CPayment({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reference, amount, vendor, phone } = location.state || {};

  const rawMpesaType = String(vendor?.mpesa_type || location.state?.mpesa_type || "PHONE").toUpperCase();
  const mpesaType = rawMpesaType === "PAYBILL" ? "LIPA_NA_MPESA" : rawMpesaType === "BUY_GOODS" ? "TILL" : rawMpesaType === "PHONE_NUMBER" || rawMpesaType === "MSISDN" ? "PHONE" : rawMpesaType;
  const initialPhone = mpesaType === "TILL"
    ? vendor?.mpesa_till || location.state?.mpesa_till || ""
    : mpesaType === "LIPA_NA_MPESA"
      ? vendor?.mpesa_paybill || location.state?.mpesa_paybill || ""
      : vendor?.mpesa_number || vendor?.MpesaNo || vendor?.mpesa_no || location.state?.mpesa_number || location.state?.MpesaNo || location.state?.mpesa_no || phone || "";
  const destinationLabel = mpesaType === "TILL"
    ? "M-Pesa Till number"
    : mpesaType === "LIPA_NA_MPESA"
      ? "M-Pesa Paybill number"
      : "M-Pesa phone number (2547XXXXXXXX)";
  const initialAmount = amount || "";
  const vendorName = vendor?.company_name || vendor?.name || [vendor?.first_name, vendor?.surname_name].filter(Boolean).join(" ") || "Vendor";

  const [inputPhone] = useState(String(initialPhone || "").trim());
  const [inputAmount, setInputAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
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

  const handleAmountChange = (e) => {
    setInputAmount(e.target.value);
    setMessage(null);
    setError(null);
  };

  const handlePayment = async () => {
    setError(null);
    setMessage(null);

    const normalizedPhone = mpesaType === "PHONE" ? normalizePhone(inputPhone) : "";
    const normalizedDestination = String(inputPhone || "").replace(/\D/g, "");

    if (!inputPhone || !inputAmount) {
      setError("⚠️ The vendor's registered M-Pesa destination and payout amount are required.");
      return;
    }

    if (mpesaType === "PHONE" && !/^2547\d{8}$/.test(normalizedPhone)) {
      setError("⚠️ Invalid phone format. Use 2547XXXXXXXX.");
      return;
    }

    if ((mpesaType === "TILL" || mpesaType === "LIPA_NA_MPESA") && !/^\d{5,20}$/.test(normalizedDestination)) {
      setError("⚠️ The vendor's registered Till or Paybill number is invalid.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Call backend endpoint for single vendor payment
      const res = await api.post(`/api/vendor/payout/${reference}/pay/`, {
        phone: normalizedPhone,
        mpesa_type: mpesaType,
        mpesa_number: mpesaType === "PHONE" ? normalizedPhone : "",
        mpesa_till: mpesaType === "TILL" ? normalizedDestination : "",
        mpesa_paybill: mpesaType === "LIPA_NA_MPESA" ? normalizedDestination : "",
        amount: inputAmount,
      });

      setMessage(res.data.message || "✅ Payment initiated successfully.");
      showSnackbar(res.data.message || "✅ Payment initiated successfully.");
      if (onSuccess) onSuccess(res.data);

      // ✅ Connect to Django backend WebSocket
      const wsUrl = getWebSocketUrl(`/ws/payout/${reference}/`);

      const ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.type === "payout_message") {
          // ✅ Pass payout data to success page
          ws.close();
          navigate(`vendor-payouts/success/${reference}`, {
            state: { payout: data },
          });
        }
      };

      ws.onerror = (err) => console.error("WebSocket error:", err);
    } catch (err) {
      console.error(err);
      const errorMessage = err.response?.data?.error || "Something went wrong.";
      setError(errorMessage);
      showSnackbar(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} />

    <Box className="mm-payout-page" sx={{ px: 2, py: { xs: 1, sm: 2 }, mt: { xs: 0, sm: -1 }, maxWidth: 760, mx: "auto", width: "100%" }}>
      <Box
        sx={{
          borderRadius: "12px",
          p: { xs: 2, sm: 3 },
          mt: 1,
          backgroundColor: "var(--card, #fff)",
          color: "var(--card-foreground, var(--foreground, #222))",
          border: "1px solid var(--border, #e6e6e4)",
        }}
        className="mm-payout-shadow"
      >
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ color: "var(--mm-foreground, var(--foreground, #222))" }}>
          M-Pesa B2C Payment
        </Typography>

        <Box className="mm-payout-logo-row mm-payout-logo-row--large">
          <img src={MpesaLogo} alt="M-Pesa Logo" className="mm-payout-logo-image mm-payout-logo-image--contain" />
        </Box>

        <Typography variant="body1" gutterBottom>
          Paying vendor: <strong>{vendorName}</strong>
        </Typography>

        <TextField
          label={destinationLabel}
          value={inputPhone}
          fullWidth
          margin="normal"
          disabled={loading}
          InputProps={{ readOnly: true }}
          helperText={mpesaType === "TILL" ? "Destination from the vendor's saved Till details." : mpesaType === "LIPA_NA_MPESA" ? "Destination from the vendor's saved Paybill details." : "Destination from the vendor's saved phone number."}
        />

        <TextField
          label="Payout amount (KES)"
          type="number"
          value={inputAmount}
          onChange={handleAmountChange}
          fullWidth
          margin="normal"
          disabled={loading}
        />

        <Button
          variant="contained"
          onClick={handlePayment}
          disabled={loading}
          fullWidth
          sx={{
            mt: 2,
            minHeight: 44,
            borderRadius: "20px",
            textTransform: "none",
            fontWeight: 700,
            backgroundColor: "var(--primary, #2563eb)",
            "&:hover": { backgroundColor: "var(--primary-hover, #1d4ed8)" },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Send Payment"}
        </Button>        
      </Box>
    </Box>
    </>
  );
}