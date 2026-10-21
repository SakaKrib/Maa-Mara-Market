import React from "react";
import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "./ui/input-otp"
import { Button } from "./ui/button"
import Maamara from "../src/assets/Logo/Maamara.jpg"
import api from "../src/Services/Api"
import AppSnackbar from "./ui/app-snackbar";

const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(";").shift()
  return ""
}

const getSecondsUntil = (expiresAt) => {
  if (!expiresAt) return 0
  const expiryTime = new Date(expiresAt).getTime()
  if (!Number.isFinite(expiryTime)) return 0
  return Math.max(0, Math.floor((expiryTime - Date.now()) / 1000))
}

const VerifyRegistrationNewUser = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = (searchParams.get("email") || "").trim().toLowerCase()
  const expiresAt = searchParams.get("expiresAt")

  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timer, setTimer] = useState(() => getSecondsUntil(expiresAt))
  const [csrfToken, setCsrfToken] = useState("")
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: ""
  })

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true })
      return
    }

    const fetchCsrf = async () => {
      try {
        await api.get("/api/get-csrf-token/", { withCredentials: true })
        setCsrfToken(getCookie("csrftoken"))
      } catch (err) {
        console.error("CSRF fetch error:", err)
      }
    }

    fetchCsrf()
  }, [email, navigate])

  useEffect(() => {
    setTimer(getSecondsUntil(expiresAt))

    if (!expiresAt) return

    const updateTimer = () => {
      setTimer(getSecondsUntil(expiresAt))
    }

    updateTimer()
    const interval = setInterval(updateTimer, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setSnackbar({ open: true, severity: "error", message: "Please enter a 6-digit OTP." })
      return
    }

    if (timer <= 0) {
      setSnackbar({ open: true, severity: "error", message: "OTP has expired. Please request a new one." })
      return
    }

    if (!csrfToken) {
      setSnackbar({ open: true, severity: "error", message: "CSRF token missing. Please refresh and try again." })
      return
    }

    setLoading(true)
    setSnackbar({ open: false, severity: "success", message: "" })

    try {
      const response = await api.post(
        "/api/verify-otp/",
        { email, otp },
        {
          headers: { "X-CSRFToken": csrfToken },
          withCredentials: true
        }
      )

      if (response.data?.success) {
        setSnackbar({
          open: true,
          severity: "success",
          message: "OTP verified successfully!"
        })
        setOtp("")
        setTimeout(() => navigate("/customer-login"), 500)
      } else {
        setSnackbar({
          open: true,
          severity: "error",
          message: response.data?.message || "Invalid OTP. Please try again."
        })
      }
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Something went wrong. Please try again."
      })
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!csrfToken) {
      setSnackbar({ open: true, severity: "error", message: "CSRF token missing. Please refresh and try again." })
      return
    }

    setResending(true)
    setSnackbar({ open: false, severity: "success", message: "" })

    try {
      const response = await api.post(
        "/api/resend-otp/",
        { email },
        {
          headers: { "X-CSRFToken": csrfToken },
          withCredentials: true
        }
      )

      if (response.data?.success) {
        setSnackbar({
          open: true,
          severity: "success",
          message: "A new OTP has been sent to your email."
        })
        setOtp("")

        setTimer(getSecondsUntil(response.data.expires_at))
      } else {
        setSnackbar({
          open: true,
          severity: "error",
          message: response.data?.message || "Failed to resend OTP."
        })
      }
    } catch (err) {
      setSnackbar({
        open: true,
        severity: "error",
        message: err.response?.data?.message || "Something went wrong. Please try again."
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="mm-otp-screen">
      <div className="mm-otp-card">
        <div className="mm-otp-brand">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="Maa Mara Market logo" />
            <span>Maa Mara Market</span>
          </div>
        </div>

        <h1 className="mm-otp-heading">Verify your email</h1>
        <p className="mm-otp-description">
          Enter the 6-digit code sent to{" "}
          <span className="mm-otp-address">{email}</span>
        </p>

        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          className="mm-otp-input" inputMode="numeric" pattern="[0-9]*" autoComplete="one-time-code" aria-label="Six-digit email verification code"
        >
          <InputOTPGroup className="mm-otp-group">
            {[0, 1, 2].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="mm-otp-slot"
              />
            ))}
          </InputOTPGroup>
          <InputOTPSeparator className="mm-otp-separator" />
          <InputOTPGroup className="mm-otp-group">
            {[3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="mm-otp-slot"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="mm-otp-actions">
          <Button
            className="primary-button w-full"
            onClick={handleVerify}
            disabled={loading || otp.length !== 6 || timer <= 0}
          >
            {loading ? "Verifying..." : timer <= 0 ? "OTP Expired" : "Verify OTP"}
          </Button>

          <Button
            variant="outline"
            className="light-button w-full"
            onClick={handleResend}
            disabled={timer > 0 || resending}
          >
            {timer > 0
              ? `Resend OTP in ${timer}s`
              : resending
                ? "Resending..."
                : "Resend OTP"}
          </Button>
        </div>

        <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))} autoHideDuration={6000} />
      </div>
    </div>
  )
}

export default VerifyRegistrationNewUser
