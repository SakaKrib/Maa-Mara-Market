import { useEffect, useState } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "./ui/input-otp"
import Snackbar from "@mui/material/Snackbar"
import Alert from "@mui/material/Alert"
import { Button } from "./ui/button"
import Maamara from "../src/assets/Logo/Maamara.jpg"
import api from "../src/Services/Api"

const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(";").shift()
  return ""
}

const VerifyRegistrationNewUser = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = (searchParams.get("email") || "").trim().toLowerCase()
  const expiresAt = searchParams.get("expiresAt")

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
    if (!expiresAt) {
      setTimer(90)
      return
    }

    const expiryDate = new Date(expiresAt)
    const updateTimer = () => {
      const diff = Math.floor((expiryDate - new Date()) / 1000)
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

        if (response.data.expires_at) {
          const diff = Math.floor(
            (new Date(response.data.expires_at) - new Date()) / 1000
          )
          setTimer(diff > 0 ? diff : 0)
        } else {
          setTimer(90)
        }
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
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="bg-white p-6 rounded-[20px] md:p-8 shadow-lg w-full max-w-sm">
        <div className="flex justify-center mb-4">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-5 h-5" />
            <h2 className="text-lg font-semibold">Maamara Market</h2>
          </div>
        </div>

        <h1 className="text-lg font-semibold mb-2 text-center">Verify OTP</h1>
        <p className="text-sm text-muted-foreground text-center mb-6">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-foreground break-all">{email}</span>
        </p>

        <InputOTP
          maxLength={6}
          value={otp}
          onChange={setOtp}
          className="flex justify-center gap-3 max-w-xs mx-auto select-none rounded-xl"
        >
          <InputOTPGroup>
            {[0, 1, 2].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
              />
            ))}
          </InputOTPGroup>
          <InputOTPSeparator />
          <InputOTPGroup>
            {[3, 4, 5].map((index) => (
              <InputOTPSlot
                key={index}
                index={index}
                className="w-12 h-12 text-xl text-center rounded-xl border border-gray-300 bg-white focus:outline-none focus:border-[var(--blue)] focus:ring-1 focus:ring-[var(--blue)] transition"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        <div className="flex flex-col gap-2 justify-center items-center mt-4 text-center">
          <Button
            className="primary-button w-full mt-6"
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

        <Snackbar
          open={snackbar.open}
          autoHideDuration={6000}
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
          anchorOrigin={{ vertical: "top", horizontal: "right" }}
        >
          <Alert
            onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
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

export default VerifyRegistrationNewUser
