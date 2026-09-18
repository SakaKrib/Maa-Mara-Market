import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Button,
  useTheme,
} from "@mui/material";
import { tokens } from "../../../../theme";

const SuccessPage = ({ reference }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [status, setStatus] = useState("pending");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const socketUrl = `ws://${window.location.host}/ws/payout/${reference}/`;
    const socket = new WebSocket(socketUrl);

    socket.onopen = () => {
      console.log("🔌 Connected to WebSocket");
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "payout_success") {
        setStatus("success");
        setMessage(data.message || "Your payout was successfully processed.");
      }

      if (data.type === "payout_failed") {
        setStatus("failed");
        setMessage(data.message || "Payout failed. Please try again.");
      }
    };

    socket.onerror = (err) => {
      console.error("⚠️ WebSocket error", err);
    };

    socket.onclose = () => {
      console.log("🔌 WebSocket closed");
    };

    return () => socket.close();
  }, [reference]);

  return (
    <Box
      m="40px auto"
      width="80%"
      p="30px"
      borderRadius="12px"
      backgroundColor={colors.primary[400]}
      textAlign="center"
    >
      {status === "pending" && (
        <Box>
          <CircularProgress size={70} />
          <Typography
            variant="h3"
            color={colors.greenAccent[400]}
            sx={{ mt: 2 }}
          >
            Processing your payout...
          </Typography>

          <Typography variant="h5" color={colors.grey[300]}>
            Please wait. Do not close this page.
          </Typography>
        </Box>
      )}

      {status === "success" && (
        <Alert
          severity="success"
          sx={{
            width: "70%",
            margin: "0 auto",
            p: "20px",
            fontSize: "18px",
            backgroundColor: colors.greenAccent[700],
            color: colors.grey[100],
          }}
        >
          🎉 {message}
        </Alert>
      )}

      {status === "failed" && (
        <Alert
          severity="error"
          sx={{
            width: "70%",
            margin: "0 auto",
            p: "20px",
            fontSize: "18px",
            backgroundColor: colors.redAccent[700],
            color: colors.grey[100],
          }}
        >
          ❌ {message}
        </Alert>
      )}

      {(status === "success" || status === "failed") && (
        <Button
          variant="contained"
          sx={{
            mt: 4,
            backgroundColor: colors.greenAccent[600],
            color: colors.grey[900],
            fontSize: "16px",
            fontWeight: "bold",
            "&:hover": { backgroundColor: colors.greenAccent[500] },
          }}
          onClick={() => (window.location.href = "/admin-dashboard")}
        >
          Go to Dashboard
        </Button>
      )}
    </Box>
  );
};

export default SuccessPage;
