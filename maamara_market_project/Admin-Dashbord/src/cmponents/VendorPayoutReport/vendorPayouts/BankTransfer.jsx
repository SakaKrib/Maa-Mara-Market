import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Grid,
  useTheme,
} from "@mui/material";
import api from "../../../Services/Api";
import { tokens } from "../../../theme";
import { useLocation } from "react-router-dom";

export default function BankTransferBulkPayment({ onSuccess }) {
  const location = useLocation();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // Prefilled payments passed via navigation state or empty array
  const prefilledPayments = location.state?.payments || [];
  console.log(prefilledPayments)

  const [payments, setPayments] = useState(
    prefilledPayments.map((p) => {
      // Check if vendor is an object and has the keys you want
      const vendor = p.vendor || {};
      // Use fallback empty strings if keys are missing
      const bankAccount = vendor.BankAccountNo || "";
      const bankName = vendor.BankAccountName || "";
      const vendorName = vendor.company_name || "Unknown Vendor";
  
      return {
        vendor: vendorName,
        bankAccount,
        bankName,
        amount: p.amount || 500,
        reference: p.reference || "",
      };
    })
  );
  

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });
  const showSnackbar = (message) => setSnackbar({ open: true, message });

  // Handle input changes
  const handleChange = (index, field, value) => {
    const updated = [...payments];
    if (field === "amount") {
      updated[index][field] = Number(value);
    } else {
      updated[index][field] = value;
    }
    setPayments(updated);
  };

  // Simple validation for bank account & amount
  const validatePayments = () => {
    for (let i = 0; i < payments.length; i++) {
      const { bankAccount, amount } = payments[i];

      if (!bankAccount || bankAccount.trim().length < 6) {
        showSnackbar(`⚠️ Invalid bank account at row ${i + 1}.`);
        setError(`⚠️ Invalid bank account at row ${i + 1}.`);
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

  // Call backend API to process bulk bank transfers
  const handlePayment = async () => {
    if (!validatePayments()) return;

    setLoading(true);
    setMessage(null);
    setError(null);

    try {
      // Map to backend expected keys if different
      const payloadPayments = payments.map(
        ({ vendor, bankAccount, amount, reference }) => ({
          vendor,
          bank_account_number: bankAccount,
          amount,
          reference,
        })
      );

      const res = await api.post("/api/payout/process-payouts-by-group/", {
        payment_method: "BANK_TRANSFER",
        payments: payloadPayments,
      });

      setMessage("✅ All vendor bank transfers processed successfully.");
      showSnackbar("✅ All vendor bank transfers processed successfully.");
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(
        err.response?.data?.error || "Something went wrong during bank transfer."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {snackbar.open && <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">{snackbar.message}<button type="button" onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button></div>}
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
          Bank Transfer Bulk Payment
        </Typography>

        {/* <Grid container spacing={20} sx={{ fontWeight: "bold", mb: 1 }}>
          <Grid item xs={3}>
            Vendor
          </Grid>
          <Grid item xs={3}>
            Bank Account Number
          </Grid>
          <Grid item xs={3}>
            Bank Name
          </Grid>
          <Grid item xs={3}>
            Amount (KES)
          </Grid>
        </Grid> */}

        {payments.map((payment, index) => (
          <Grid container spacing={2} alignItems="center" key={index} sx={{ mb: 1 }}>
            <Grid item xs={3}>
              <TextField
                value={payment.vendor}
                fullWidth
                disabled
                variant="outlined"
                size="small"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                value={payment.bankAccount}
                onChange={(e) => handleChange(index, "bankAccount", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading}
                placeholder="Enter bank account number"
              />
            </Grid>

            <Grid item xs={3}>
              <TextField
                value={payment.bankName}
                onChange={(e) => handleChange(index, "bankName", e.target.value)}
                fullWidth
                variant="outlined"
                size="small"
                disabled={loading}
                placeholder="Enter bank name"
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
            "&:hover": { backgroundColor: colors.greenAccent[600], border:'none' },
            py: 1.2,
            mt: 3,
            borderRadius:'50px',
            border:'1px solid'
          }}
          className="ring rounded-full"
        >
          {loading ? <CircularProgress size={24} /> : "Send All Bank Transfers"}
        </Button>
      </Box>
    </Box>
  );
}
