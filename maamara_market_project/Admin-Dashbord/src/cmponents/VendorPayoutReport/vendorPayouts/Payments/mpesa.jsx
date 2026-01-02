import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  TextField,
  Typography,
  Alert,
  useTheme,
} from "@mui/material";
import { useLocation } from "react-router-dom";
import { tokens } from "../../../../theme";
import MpesaLogo from "../../../../assets/partnaship/mpesaLogo.png";
import api from "../../../../Services/Api"; // ✅ axios instance

export default function MpesaB2CPayment({ phone = "", onSuccess }) {
  const location = useLocation();
  const { reference, amount, vendor } = location.state || {};

  const initialPhone = vendor?.mpesa_phone || phone || "";
  const initialAmount = amount || "";
  const vendorName = vendor?.company_name || vendor?.name || "Vendor";

  const [inputPhone, setInputPhone] = useState(initialPhone);
  const [inputAmount, setInputAmount] = useState(initialAmount);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Normalize Kenyan phone numbers into 2547XXXXXXXX
  const normalizePhone = (phone) => {
    if (!phone) return "";
    let p = phone.replace(/\D/g, ""); // remove non-digits

    if (p.startsWith("07")) return "254" + p.slice(1);
    if (p.startsWith("7")) return "254" + p;
    if (p.startsWith("+254")) return p.replace("+", "");
    if (p.startsWith("254")) return p;

    return p; // fallback
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
      if (onSuccess) onSuccess(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  return (
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
            "&:hover": { backgroundColor: colors.gray[900] },
          }}
        >
          {loading ? <CircularProgress size={24} /> : "Send Payment"}
        </Button>

        {message && (
          <Alert severity="success" sx={{ mt: 2 }}>
            {message}
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </Box>
    </Box>
  );
}
