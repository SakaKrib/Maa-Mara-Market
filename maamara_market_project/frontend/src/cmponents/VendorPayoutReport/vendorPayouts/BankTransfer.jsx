import React, { useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  TextField,
  Typography,
  Grid,
} from "@mui/material";
import api from "../../../Services/Api";
import { useLocation } from "react-router-dom";
import "./payout-workflows.css";
import AppSnackbar from "../../../../components/ui/app-snackbar";

export default function BankTransferBulkPayment({ onSuccess }) {
  const location = useLocation();

  // Prefilled payments passed via navigation state or empty array
  const prefilledPayments = location.state?.payments || [];

  const [payments, setPayments] = useState(
    prefilledPayments.map((p) => {
      // Check if vendor is an object and has the keys you want
      const vendor = p.vendor || {};
      // Use fallback empty strings if keys are missing
      const bankAccount = vendor.bank_account_number || vendor.BankAccountNo || "";
      const vendorName = vendor.company_name || [vendor.first_name, vendor.middle_name, vendor.surname_name].filter(Boolean).join(" ") || "Unknown Vendor";

      return {
        vendor: vendorName,
        bankAccount,
        bankName: vendor.bank_name || "",
        bankBranch: vendor.bank_branch || "",
        bankAccountName: vendor.bank_account_name || vendor.BankAccountName || "",
        bankSwiftCode: vendor.bank_swift_code || "",
        bankIban: vendor.bank_iban || "",
        bankCountry: vendor.bank_country || "",
        bankCurrency: vendor.bank_currency || "",
        intermediaryBankName: vendor.intermediary_bank_name || "",
        intermediarySwiftCode: vendor.intermediary_swift_code || "",
        amount: p.amount ?? "",
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
            <Box
              key={payment.reference || index}
              sx={{
                mb: 2,
                p: { xs: 1.5, sm: 2 },
                border: "1px solid var(--border, #e6e6e4)",
                borderRadius: "12px",
                backgroundColor: "var(--card, #fff)",
              }}
            >
              <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
                {payment.vendor} · Bank transfer
              </Typography>
              <Grid container spacing={1.5}>
                {[
                  ["Bank name", payment.bankName],
                  ["Bank branch", payment.bankBranch],
                  ["Account name", payment.bankAccountName],
                  ["Account number", payment.bankAccount],
                  ["SWIFT / BIC", payment.bankSwiftCode],
                  ["IBAN", payment.bankIban],
                  ["Bank country", payment.bankCountry],
                  ["Bank currency", payment.bankCurrency],
                  ["Intermediary bank", payment.intermediaryBankName],
                  ["Intermediary SWIFT", payment.intermediarySwiftCode],
                ].map(([label, value]) => (
                  <Grid item xs={12} sm={6} md={4} key={label}>
                    <TextField
                      label={label}
                      value={value || "Not provided"}
                      fullWidth
                      variant="outlined"
                      size="small"
                      InputProps={{ readOnly: true }}
                    />
                  </Grid>
                ))}
                <Grid item xs={12} sm={6} md={4}>
                  <TextField
                    label="Payout amount (KES)"
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
              </Grid>
            </Box>
          ))}

          <Button
            variant="contained"
            onClick={handlePayment}
            disabled={loading}
            fullWidth
            sx={{
              "&:hover": { backgroundColor: "var(--primary-hover, #1d4ed8)", border: "none" },
              py: 1.2,
              mt: 3,
              borderRadius: "12px",
              border: "1px solid",
            }}
            className="mm-payout-rounded-control"
          >
            {loading ? <CircularProgress size={24} /> : "Send All Bank Transfers"}
          </Button>
        </Box>
      </Box>
    </>
  );
}
