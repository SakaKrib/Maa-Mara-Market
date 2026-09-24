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
import api from "../../../../Services/Api";

export default function MpesaB2CPayment({ onSuccess }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { reference, amount, vendor, phone } = location.state || {};

  const initialPhone = vendor?.mpesa_number || phone || "";
  const initialAmount = amount || "";
  const vendorName = vendor?.company_name || vendor?.name || "Vendor";

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
      const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
      const wsHost = "127.0.0.1:8000";
      const wsUrl = `${wsProtocol}://${wsHost}/ws/payout/${reference}/`;
      console.log("Connecting to WS:", wsUrl);

      const ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log("WebSocket connected!");
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WS message received:", data);

        if (data.type === "payout_message") {
          // ✅ Pass payout data to success page
          ws.close();
          navigate(`vendor-payouts/success/${reference}`, {
            state: { payout: data },
          });
        }
      };

      ws.onerror = (err) => console.error("WebSocket error:", err);
      ws.onclose = () => console.log("WebSocket closed");
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

    <Box sx={{ p: 2, mt: -3 }}>
      <Box
        sx={{
          borderRadius: 2,
          p: 2,
          mt: 2,
          backgroundColor: colors.primary[800],
          color: colors.gray[100],
        }}
        className="shadow"
      >
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          M-Pesa B2C Payment
        </Typography>

        <Box className="w-full flex justify-center h-[200px]">
          <img src={MpesaLogo} alt="M-Pesa Logo" className="object-contain" />
        </Box>

        <Typography variant="body1" gutterBottom>
          Paying vendor: <strong>{vendorName}</strong>
        </Typography>

        <TextField
          label="Phone (2547XXXXXXXX)"
          value={inputPhone}
          onChange={handlePhoneChange}
          fullWidth
          margin="normal"
          disabled={loading}
        />

        <TextField
          label="Amount"
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