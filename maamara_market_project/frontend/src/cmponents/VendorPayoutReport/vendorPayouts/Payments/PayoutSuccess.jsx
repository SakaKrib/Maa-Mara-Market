import React from "react";
import { Box, Typography, Button, useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import { useNavigate, useLocation, useParams } from "react-router-dom";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function PayoutSuccess() {
  const { reference } = useParams();
  const location = useLocation(); // get passed state
  const navigate = useNavigate();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const payout = location.state?.payout || null;

  const handleGoBack = () => navigate("/vendor/payouts");

  const maskTransaction = (id) => {
    if (!id || id.length <= 6) return id;
    return `${id.slice(0, 3)}...${id.slice(-3)}`;
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.primary[900],
        p: 2,
      }}
    >
      <Box
        sx={{
          borderRadius: 2,
          p: 4,
          width: "100%",
          maxWidth: 700,
          backgroundColor: colors.primary[800],
          color: colors.gray[100],
          textAlign: "center",
          boxShadow: 3,
        }}
      >
        {payout?.status === "success" && (
          <CheckCircleIcon
            sx={{ fontSize: 80, color: colors.greenAccent[500], mb: 2 }}
          />
        )}

        <Typography variant="h5" sx={{ mb: 2 }}>
          {payout?.status === "success"
            ? "Payment Successful!"
            : payout?.status === "failed"
            ? "Payment Failed"
            : "Processing Payment..."}
        </Typography>

        {payout && (
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mt: 3,
              p: 2,
              backgroundColor: colors.primary[700],
              borderRadius: 1,
            }}
          >
            {/* Vendor */}
            <Box sx={{ textAlign: "center", flex: 1 }} className='shadow-custom'>
              <Typography fontWeight="bold">Vendor</Typography>
              <Typography>{payout.vendor}</Typography>
            </Box>

            {/* Amount */}
            <Box sx={{ textAlign: "center", flex: 1 }} className='shadow-custom'>
              <Typography fontWeight="bold">Amount</Typography>
              <Typography>{payout.amount}</Typography>
            </Box>

            {/* Transaction ID */}
            <Box sx={{ textAlign: "center", flex: 1 }} className='shadow-custom'>
              <Typography fontWeight="bold">Transaction ID</Typography>
              <Typography>{maskTransaction(payout.transaction_id)}</Typography>
            </Box>

            {/* Status */}
            <Box sx={{ textAlign: "center", flex: 1 }} className='shadow-custom'>
              <Typography fontWeight="bold">Status</Typography>
              <Typography
                sx={{
                  color:
                    payout.status === "success"
                      ? colors.greenAccent[500]
                      : colors.redAccent[500],
                }}
              >
                {payout.status === "success" ? "Paid" : "Failed"}
              </Typography>
            </Box>
          </Box>
        )}

        {!payout && (
          <Typography variant="body1" sx={{ mt: 2 }}>
            Waiting for payout confirmation...
          </Typography>
        )}

        <Button
          variant="contained"
          sx={{
            mt: 4,
            backgroundColor: colors.greenAccent[700],
            "&:hover": { backgroundColor: colors.gray[900] },
          }}
          onClick={handleGoBack}
        >
          Back to Payouts
        </Button>
      </Box>
    </Box>
  );
}