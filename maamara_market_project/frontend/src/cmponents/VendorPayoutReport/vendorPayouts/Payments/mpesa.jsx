import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  TextField,
  Typography,
  useTheme,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import { tokens } from "../../../../theme";
import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import api, { getWebSocketUrl } from "../../../../Services/Api";
import "../payout-workflows.css";
import AppSnackbar from "../../../../../components/ui/app-snackbar";

export default function MpesaB2CPayment({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reference, amount, vendor, phone } = location.state || {};

  const initialPhone = vendor?.mpesa_number || vendor?.MpesaNo || vendor?.mpesa_no || phone || "";
  const initialAmount = amount || "";
  const vendorName = vendor?.company_name || vendor?.name || [vendor?.first_name, vendor?.surname_name].filter(Boolean).join(" ") || "Vendor";

  const [inputPhone, setInputPhone] = useState(initialPhone);
  const [inputAmount, setInputAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const normalizePhone = (phone) => {
    if (!phone) return "";
    let p = phone.replace(/\D/g, "");
    if (p.startsWith("07")) return "254" + p.slice(1);
    if (p.startsWith("7")) return "254" + p;
    if (p.startsWith("+254")) return p.replace("+", "");
    if (p.startsWith("254")) return p;
    return p;
  };

  const handlePhoneChange = (e) => {
    const normalized = normalizePhone(e.target.value);
    setInputPhone(normalized);
    setMessage(null);
    setError(null);
  };

  const handleAmountChange = (e) => {
    setInputAmount(e.target.value);
    setMessage(null);
    setError(null);
  };

  const handlePayment = async () => {
    setError(null);
    setMessage(null);

    const normalizedPhone = normalizePhone(inputPhone);

    if (!normalizedPhone || !inputAmount) {
      setError("⚠️ Please enter both phone number and amount.");
      return;
    }

    if (!/^2547\d{8}$/.test(normalizedPhone)) {
      setError("⚠️ Invalid phone format. Use 2547XXXXXXXX.");
      return;
    }

    try {
      setLoading(true);

      // ✅ Call backend endpoint for single vendor payment
      const res = await api.post(`/api/vendor/payout/${reference}/pay/`, {
        phone: normalizedPhone,
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

    <Box className="mm-payout-page" sx={{ p: { xs: 1, sm: 2 }, mt: { xs: 0, sm: -1 }, maxWidth: 760, mx: "auto", width: "100%" }}>
      <Box
        sx={{
          borderRadius: 2,
          p: 2,
          mt: 2,
          backgroundColor: colors.primary[800],
          color: colors.gray[100],
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
          label="Vendor M-Pesa number (2547XXXXXXXX)"
          value={inputPhone}
          onChange={handlePhoneChange}
          fullWidth
          margin="normal"
          disabled={loading}
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
            backgroundColor: colors.greenAccent[700],
            "&:hover": { backgroundColor: colors.greenAccent[800] },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Send Payment"}
        </Button>        
      </Box>
    </Box>
    </>
  );
}