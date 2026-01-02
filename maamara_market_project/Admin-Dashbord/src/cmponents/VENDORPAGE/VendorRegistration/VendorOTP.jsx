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

const OTPVerification = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [otp, setOtp] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [timer, setTimer] = useState(0);

  // ✅ Extract email from location.state (passed from previous form)
  useEffect(() => {
    if (location.state?.email) {
      setEmail(location.state.email);
    } else {
      setError("Email is missing. Please go back and register again.");
    }
  }, [location.state]);

  // ⏳ Countdown timer
  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    } else if (timer === 0) {
      clearInterval(interval);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async () => {
    setError("");
    setSuccess("");

    if (!email) {
      setError("Email is missing. Please go back and register again.");
      return;
    }

    if (otp.length !== 6) {
      setError("Please enter a 6-digit OTP.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/api/verify-otp-vendor/", {
        email,
        otp,
      });

      setSuccess(response.data.message || "OTP verified successfully!");
      setOtp("");
      // redirect after success
      navigate("/vendor-success-page");
    } catch (err) {
      setError(err.response?.data?.message || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setSuccess("");
    setResending(true);

    try {
      const response = await api.post("/api/resend-otp-vendor/", { email });
      setSuccess(response.data.message || "OTP resent successfully!");
      setTimer(600); // 10 minutes timer
    } catch (err) {
      setError(err.response?.data?.message || "Failed to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="w-full h-screen bg-muted flex judtify-center items-center">
    <div className="max-w-md lg:w-fit mx-auto p-4 border rounded shadow relative top-10">
      <div className="flex flex-col mt-2 mb-2 justify-center items-center">
      <h2 className="text-xl font-semibold mb-4">Verify Your Vendor OTP</h2>

      {email && <p className="mb-3 text-gray-600">📩 Sent to: {email}</p>}
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {success && <p className="text-green-600 mb-2">{success}</p>}
    
      <InputOTP maxLength={6} value={otp} onChange={setOtp}>
        <InputOTPGroup>
          <InputOTPSlot index={0} />
          <InputOTPSlot index={1} />
          <InputOTPSlot index={2} />
        </InputOTPGroup>
        <InputOTPSeparator />
        <InputOTPGroup>
          <InputOTPSlot index={3} />
          <InputOTPSlot index={4} />
          <InputOTPSlot index={5} />
        </InputOTPGroup>
      </InputOTP>
      </div>

      <Button
        onClick={handleVerify}
        disabled={loading || otp.length !== 6}
        className="mt-4 w-full"
      >
        {loading ? "Verifying..." : "Verify OTP"}
      </Button>

      <Button
        variant="outline"
        onClick={handleResend}
        disabled={resending || timer > 0}
        className="mt-4 w-full"
      >
        {timer > 0
          ? `Resend OTP in ${timer}s`
          : resending
          ? "Resending..."
          : "Resend OTP"}
      </Button>
    </div>
    </div>
  );
};

export default OTPVerification;
