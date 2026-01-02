import { useState, useEffect } from "react"
import axios from "axios"
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator
} from "./ui/input-otp"
import { Button } from "./ui/button"
import { baseUrl } from "../src/cmponents/Constant/Constant"

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
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [timer, setTimer] = useState(0)
  const [csrfToken, setCsrfToken] = useState("")

  // ✅ Fetch CSRF token on mount
  useEffect(() => {
    const fetchCsrf = async () => {
      try {
        await axios.get(`${baseUrl}/api/get-csrf-token/`, { withCredentials: true })
        const token = getCookie("csrftoken")
        setCsrfToken(token)
      } catch (err) {
        console.error("CSRF fetch error:", err)
      }
    }
    fetchCsrf()
  }, [])

  // ✅ Initialize countdown timer from backend expiry timestamp
  useEffect(() => {
    console.log("[Timer Effect] expiresAt:", expiresAt)

    if (!expiresAt) {
      console.log("[Timer Effect] No expiresAt. Using fallback 90s.")
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
      setError("Please enter a 6-digit OTP.")
      return
    }
    if (timer <= 0) {
      setError("OTP has expired. Please request a new one.")
      return
    }
    if (!csrfToken) {
      setError("CSRF token missing. Please refresh and try again.")
      return
    }

    setLoading(true)
    setError("")
    setSuccess("")

    try {
      console.log("[Verify OTP] Sending:", { email, otp })
      const response = await axios.post(
        `${baseUrl}/api/verify-otp/`,
        { email, otp },
        { headers: { "X-CSRFToken": csrfToken }, withCredentials: true }
      )

      if (response.data?.success) {
        setSuccess("✅ OTP verified successfully!")
        setOtp("")
        onVerify()
      } else {
        setError(response.data?.message || "Invalid OTP. Please try again.")
      }
    } catch (err) {
      console.error("[Verify OTP] Error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const handleResend = async () => {
    if (!csrfToken) {
      setError("CSRF token missing. Please refresh and try again.")
      return
    }
    setResending(true)
    setError("")
    setSuccess("")

    try {
      console.log("[Resend OTP] Sending request for:", email)
      const response = await axios.post(
        `${baseUrl}/api/resend-otp/`,
        { email },
        { headers: { "X-CSRFToken": csrfToken } }
      )

      if (response.data?.success) {
        setSuccess("📨 A new OTP has been sent to your email.")
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
        setError(response.data?.message || "Failed to resend OTP.")
      }
    } catch (err) {
      console.error("[Resend OTP] Error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-sm">
        <h2 className="text-lg font-semibold mb-4">Verify OTP</h2>

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

        <Button
          onClick={handleVerify}
          disabled={loading || otp.length !== 6 || timer <= 0}
          className="mt-4 w-full"
        >
          {loading ? "Verifying..." : timer <= 0 ? "OTP Expired" : "Verify OTP"}
        </Button>

        <div className="mt-4 text-center">
          <Button
            variant="outline"
            onClick={handleResend}
            disabled={timer > 0 || resending}
            className="w-full"
          >
            {timer > 0
              ? `Resend OTP in ${timer}s`
              : resending
              ? "Resending..."
              : "Resend OTP"}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default OTPModal
