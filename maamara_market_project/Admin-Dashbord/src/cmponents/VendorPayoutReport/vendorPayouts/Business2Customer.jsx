import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Box,
  Typography,
  useTheme,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
} from "@mui/material";
import { tokens } from "../../../theme";
import { useGenerateMonthlyPayouts } from "../../Hooks/Payouts/GeneratePayoutHook";
import { useNavigate } from "react-router-dom";

export default function AdminPayoutTriggerPayment() {
  const { data, loading, error, generateMonthlyPayouts } = useGenerateMonthlyPayouts();
  const [payingReference, setPayingReference] = useState(null);
  const [payError, setPayError] = useState(null);
  const [paySuccess, setPaySuccess] = useState(null);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // -------------------------------
  // Pay Single Vendor
  // -------------------------------
  const handlePayVendor = (payout) => {
    const vendor = payout.vendor_details || payout.vendor || {};
    const { payment_method, reference, amount } = payout;

    switch (payment_method) {
      case "MOBILE_MONEY":
        navigate("mpesa-payment/single-vendor", { state: { reference, amount, vendor } });
        break;
      case "PAYPAL":
        navigate("paypal-payment/single-vendor", { state: { reference, amount, vendor } });
        break;
      case "BANK_TRANSFER":
        navigate("/bank-transfer-payment/single-vendor", { state: { reference, amount, vendor } });
        break;
      default:
        navigate("/generic-payment", { state: { reference, amount, vendor, payment_method } });
    }
  };

  // -------------------------------
  // Pay Group (All Vendors in Method)
  // -------------------------------
  const handlePayGroup = (paymentMethod) => {
    const grouped = data?.generated?.[paymentMethod] || [];

    const payments = grouped.map((payout) => {
      const vendor = payout.vendor_details || payout.vendor || {};

      return {
        vendor,
        phone: vendor.MpesaNo || vendor.mpesa_no || "",
        amount: payout.amount,
        reference: payout.reference,
      };
    });

    switch (paymentMethod) {
      case "MOBILE_MONEY":
        navigate("mpesa-payment-group", { state: { paymentMethod, payments } });
        break;
      case "PAYPAL":
        navigate("paypal-payment-group", { state: { paymentMethod, payments } });
        break;
      case "BANK_TRANSFER":
        navigate("bank-transfer-payment-group", { state: { paymentMethod, payments } });
        break;
      default:
        navigate("/generic-payment-group", { state: { paymentMethod, payments } });
    }
  };

  const groupedPayouts = data?.generated || {};

  return (
    <Box sx={{ color: colors.gray[100], p: 3 }}>
      <Typography variant="h5" gutterBottom fontWeight="bold">
        Generate & Review Monthly Payouts
      </Typography>

      {/* GENERATE BUTTON */}
      <Button
        variant="contained"
        onClick={generateMonthlyPayouts}
        disabled={loading}
        sx={{
          backgroundColor: colors.primary[400],
          "&:hover": { backgroundColor: colors.greenAccent[500] },
          mb: 3,
        }}
      >
        {loading ? <CircularProgress size={24} /> : "Generate Payouts"}
      </Button>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {payError && <Alert severity="error" sx={{ mb: 2 }}>{payError}</Alert>}
      {paySuccess && <Alert severity="success" sx={{ mb: 2 }}>{paySuccess}</Alert>}

      {data && (
        <>
          <Typography variant="subtitle1" gutterBottom>
            Payouts for period: <strong>{data.period}</strong>
          </Typography>

          {Object.keys(groupedPayouts).length === 0 && (
            <Typography>No payouts generated yet.</Typography>
          )}

          {/* PAYMENT GROUP LISTS */}
          {Object.entries(groupedPayouts).map(([method, payouts]) => (
            <Box key={method} sx={{ mb: 4 }}>
              <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                <Typography variant="h6" sx={{ textTransform: "uppercase" }}>
                  {method.replace("_", " ")}
                </Typography>

                {/* PAY GROUP BUTTON */}
                <Button
                  variant="contained"
                  size="small"
                  onClick={() => handlePayGroup(method)}
                  disabled={payingReference === `group-${method}`}
                  sx={{ backgroundColor: colors.primary[400], color: colors.gray[100] }}
                >
                  {payingReference === `group-${method}` ? <CircularProgress size={18} /> : "Pay All"}
                </Button>
              </Box>

              <Divider sx={{ mb: 2 }} />

              <List>
                {payouts.map((payout) => {
                  const vendor = payout.vendor_details || payout.vendor || {};

                  return (
                    <ListItem
                      key={payout.reference}
                      secondaryAction={
                        payout.payout_status ? (
                          <Button variant="outlined" disabled sx={{ backgroundColor: colors.gray[700], color: colors.gray[400] }}>
                            Paid
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => handlePayVendor(payout)}
                            disabled={payingReference === payout.reference}
                            sx={{ backgroundColor: colors.gray[100] }}
                          >
                            {payingReference === payout.reference ? <CircularProgress size={18} /> : "Pay"}
                          </Button>
                        )
                      }
                    >
                      <ListItemText
                        primary={`${vendor.company_name || vendor.name || "Unknown Vendor"} – KES ${payout.amount.toLocaleString()}`}
                      />
                    </ListItem>
                  );
                })}
              </List>
            </Box>
          ))}
        </>
      )}
    </Box>
  );
}
