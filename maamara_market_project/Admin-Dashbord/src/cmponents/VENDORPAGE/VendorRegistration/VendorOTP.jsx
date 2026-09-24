import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from "../../../../components/ui/input-otp";
import { Button } from "../../../../components/ui/button";
import api from "../../../../src/Services/Api";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import Maamara from "../../../assets/Logo/Maamara.jpg";

const OTPVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [timer, setTimer] = useState(0);

  // Snackbar state
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success", // "success" | "error"
    message: "",
  });

  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      openSnackbar("error", "Email is missing. Please go back and register again.");
    }
  }, [location.state]);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const openSnackbar = (severity, message) => {
    setSnackbar({ open: true, severity, message });
  };

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleVerify = async () => {
    if (!email) {
      openSnackbar("error", "Email is missing. Please go back and register again.");
      return;
    }

    if (otp.length !== 6) {
      openSnackbar("error", "Please enter a 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/verify-otp-vendor/", {
        email,
        otp,
      });

      openSnackbar("success", response.data.message || "OTP verified successfully!");
      setOtp("");
      // Redirect after success with a small delay so snackbar shows
      setTimeout(() => navigate("/vendor-success-page"), 1500);
    } catch (err) {
      openSnackbar("error", err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);

    try {
      const response = await api.post("/api/resend-otp-vendor/", { email });
      openSnackbar("success", response.data.message || "OTP resent successfully!");
      setTimer(600); // 10 minutes timer
    } catch (err) {
      openSnackbar("error", err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex items-center justify-center z-50">
      
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm relative">
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Maamara Market</h2>
          </div>
        </div>
        <h2 className="text-lg font-semibold mb-6 text-center">Verify Your Vendor OTP</h2>

        {email && <p className="mb-3 text-gray-600 text-center">📩 Sent to: {email}</p>}

        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          className="flex justify-center gap-3 max-w-xs mx-auto select-none rounded-xl"
        >
          <InputOTPGroup>
            <InputOTPSlot
              index={0}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
            <InputOTPSlot
              index={1}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
            <InputOTPSlot
              index={2}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot
              index={3}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
            <InputOTPSlot
              index={4}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
            <InputOTPSlot
              index={5}
              className="w-12 h-20 text-2xl text-center rounded-xl border border-gray-300 shadow-sm focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 transition"
            />
          </InputOTPGroup>
        </InputOTP>

        <Button onClick={handleVerify} disabled={loading || otp.length !== 6} className="mt-6 w-full">
          {loading ? "Verifying..." : "Verify OTP"}
        </Button>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={resending || timer > 0}
          className="mt-4 w-full"
        >
          {timer > 0 ? `Resend OTP in ${timer}s` : resending ? "Resending..." : "Resend OTP"}
        </Button>

        {/* Snackbar for notifications */}
        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
            {snackbar.message}
            <button
              type="button"
              onClick={handleSnackbarClose}
              className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
              aria-label="Dismiss notification"
            >
              ×
            </button>
          </div>
        </Snackbar>
      </div>
    </div>
  );
};

export default OTPVerification;
