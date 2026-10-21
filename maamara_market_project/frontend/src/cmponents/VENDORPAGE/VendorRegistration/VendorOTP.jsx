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
import Maamara from "../../../assets/Logo/Maamara.jpg";
import AppSnackbar from "../../../../components/ui/app-snackbar";

const getSecondsUntil = (expiresAt) => {
  if (!expiresAt) return 0;
  const expiryTime = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiryTime)) return 0;
  return Math.max(0, Math.floor((expiryTime - Date.now()) / 1000));
};

const OTPVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiryTimestamp, setExpiryTimestamp] = useState(location.state?.expiresAt || null);
  const [timer, setTimer] = useState(() => getSecondsUntil(location.state?.expiresAt));

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
    setTimer(getSecondsUntil(expiryTimestamp));
    if (!expiryTimestamp) return undefined;

    const updateTimer = () => setTimer(getSecondsUntil(expiryTimestamp));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [expiryTimestamp]);

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
      openSnackbar("error", err.response?.data?.message || err.response?.data?.error || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setResending(true);

    try {
      const response = await api.post("/api/resend-otp-vendor/", { email });
      openSnackbar("success", response.data.message || "OTP resent successfully!");
      const newExpiry = response.data.expires_at || new Date(Date.now() + 180000).toISOString();
      setExpiryTimestamp(newExpiry);
      setTimer(getSecondsUntil(newExpiry) || 180);
    } catch (err) {
      openSnackbar("error", err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="mm-otp-screen mm-otp-screen--fixed">
      
      <div className="mm-otp-card">
        <div className="mm-otp-brand">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="Maa Mara Market logo" />
            <span>Maa Mara Market</span>
          </div>
        </div>
        <h1 className="mm-otp-heading">Verify your vendor registration</h1>

        {email && <p className="mm-otp-description">Enter the six-digit code sent to <span className="mm-otp-address">{email}</span>.</p>}

        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          containerClassName="mm-otp-input" className="mm-otp-native-input" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" aria-label="Six-digit vendor verification code"
        >
          <InputOTPGroup className="mm-otp-group">
            <InputOTPSlot
              index={0}
              className="mm-otp-slot"
            />
            <InputOTPSlot
              index={1}
              className="mm-otp-slot"
            />
            <InputOTPSlot
              index={2}
              className="mm-otp-slot"
            />
          </InputOTPGroup>
          <InputOTPSeparator className="mm-otp-separator" />
          <InputOTPGroup className="mm-otp-group">
            <InputOTPSlot
              index={3}
              className="mm-otp-slot"
            />
            <InputOTPSlot
              index={4}
              className="mm-otp-slot"
            />
            <InputOTPSlot
              index={5}
              className="mm-otp-slot"
            />
          </InputOTPGroup>
        </InputOTP>

        <div className="mm-otp-actions">
        <Button onClick={handleVerify} disabled={loading || otp.length !== 6 || timer <= 0} className="primary-button w-full">
          {loading ? "Verifying..." : timer <= 0 ? "OTP expired" : "Verify OTP"}
        </Button>

        <Button
          variant="outline"
          onClick={handleResend}
          disabled={resending || timer > 0}
          className="light-button w-full"
        >
          {timer > 0 ? `Resend OTP in ${timer}s` : resending ? "Resending..." : "Resend OTP"}
        </Button>
        </div>

        {/* Snackbar for notifications */}
        <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleSnackbarClose} autoHideDuration={6000} />
      </div>
    </div>
  );
};

export default OTPVerification;
