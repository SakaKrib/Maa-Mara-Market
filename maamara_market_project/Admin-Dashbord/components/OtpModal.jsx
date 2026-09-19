import { useState, useEffect } from "react"
import api from "../src/Services/Api"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from "./ui/input-otp"
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { Button } from "./ui/button"
import Maamara from "../src/assets/Logo/Maamara.jpg"

// 🍪 Helper to read CSRF token from cookies
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(";").shift()
  return ""
}

const OTPModal = ({ email, onVerify, expiresAt }) => {
  const [otp, setOtp] = useState("")
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [timer, setTimer] = useState(0)
  const [csrfToken, setCsrfToken] = useState("")

  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success",
    message: ""
  })

  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        await api.get("/api/get-csrf-token/", { withCredentials: true })
        const token = getCookie("csrftoken")
        setCsrfToken(token)
      } catch (err) {
        console.error("CSRF fetch error:", err)
      }
    }
    fetchCsrf()
  }, [])

  useEffect(() => {
    if (!expiresAt) {
      setTimer(90)
      return
    }

    const expiryDate = new Date(expiresAt)
    const updateTimer = () => {
      const now = new Date()
      const diff = Math.floor((expiryDate - now) / 1000)
      setTimer(diff > 0 ? diff : 0)
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
      const response = await api.post("/api/verify-otp/", { email, otp }, { headers: { "X-CSRFToken": csrfToken }, withCredentials: true })

      if (response.data?.success) {
        setSnackbar({ open: true, severity: "success", message: "✅ OTP verified successfully!" })
        setOtp("")
        onVerify()
      } else {
        setSnackbar({ open: true, severity: "error", message: response.data?.message || "Invalid OTP. Please try again." })
      }
    } catch {
      setSnackbar({ open: true, severity: "error", message: "Something went wrong. Please try again." })
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
      const response = await api.post("/api/resend-otp/", { email }, { headers: { "X-CSRFToken": csrfToken } })

      if (response.data?.success) {
        setSnackbar({ open: true, severity: "success", message: "📨 A new OTP has been sent to your email." })
        setOtp("")

        if (response.data.expires_at) {
          const expiryDate = new Date(response.data.expires_at)
          const now = new Date()
          const diff = Math.floor((expiryDate - now) / 1000)
          setTimer(diff > 0 ? diff : 0)
        } else {
          setTimer(90)
        }
      } else {
        setSnackbar({ open: true, severity: "error", message: response.data?.message || "Failed to resend OTP." })
      }
    } catch {
      setSnackbar({ open: true, severity: "error", message: "Something went wrong. Please try again." })
    } finally {
      setResending(false)
    }
  }

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  return (
    <div className="fixed inset-0 bg-opacity-50 flex items-center justify-center z-50 bg-black/30">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Maamara Market</h2>
          </div>
        </div>
        

        <h2 className="text-lg font-semibold mb-6 text-center">Verify OTP</h2>

      <div className="w-full">
        <InputOTP maxLength={6} value={otp} onChange={setOtp} className="flex justify-center gap-3 max-w-xs mx-auto select-none rounded-xl">
          <InputOTPGroup>
            <InputOTPSlot
              index={0}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
            <InputOTPSlot
              index={1}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
            <InputOTPSlot
              index={2}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            <InputOTPSlot
              index={3}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
            <InputOTPSlot
              index={4}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
            <InputOTPSlot
              index={5}
              className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
            />
          </InputOTPGroup>
        </InputOTP>

        <Button
          className="primary-button w-full mt-6"
          onClick={handleVerify}
          disabled={loading || otp.length !== 6 || timer <= 0}
        >
          {loading ? "Verifying..." : timer <= 0 ? "OTP Expired" : "Verify OTP"}
        </Button>

        <div className="mt-4 text-center">
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
        </div>

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={handleSnackbarClose}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={handleSnackbarClose}
            severity={snackbar.severity}
            sx={{ width: "100%" }}
            elevation={6}
            variant="filled"
          >
            {snackbar.message}
          </Alert>
        </Snackbar>
      </div>
    </div>
  )
}

export default OTPModal
