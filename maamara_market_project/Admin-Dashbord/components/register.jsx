import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import OTPModal from "./OtpModal"
import { baseUrl } from "../src/cmponents/Constant/Constant";
import { useNavigate } from "react-router-dom";
import Maamara from "../src/assets/Logo/Maamara.jpg";
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'
import { Eye, EyeOff } from "lucide-react"



// 🧠 Helper to read cookie
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(';').shift()
  return ""
}

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    First_name: "",
    Sur_name: "",
    username: "",
    email: "",
    password: "",
    password2: "",
    referral_code: ""
  })

  const navigate = useNavigate()
  const [csrfToken, setCsrfToken] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [otpSent, setOtpSent] = useState(false)
  const [expiryTime, setExpiryTime] = useState(null)  // ⏳ new state for OTP expiry

  // 🔐 Fetch CSRF token cookie on mount
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/get-csrf-token/`, {
      method: "GET",
      credentials: "include",
    })
      .then(() => {
        const token = getCookie("csrftoken")
        setCsrfToken(token)
      })
      .catch(err => console.error("CSRF fetch error:", err))
  }, [])

  // Replace old message & error state with snackbar state:
  const [snackbar, setSnackbar] = useState({
    open: false,
    severity: "success", // "success" | "error"
    message: ""
  });

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError("")
    setMessage("")

    try {
      const response = await fetch(`${baseUrl}/api/register/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "X-CSRFToken": csrfToken
        },
        credentials: "include",
        body: new URLSearchParams(formData)
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setMessage(data.message)
        setSnackbar({ open: true, severity: "success", message: data.message })
        setOtpSent(true)
        setExpiryTime(data.expires_at)  // ✅ store expiry time
      } else {
        const errorMsg = data.message || "Registration failed."
        setError(errorMsg)
        setSnackbar({ open: true, severity: "error", message: errorMsg })
      }
    } catch (err) {
      console.error("Registration error:", err)
      const errorMsg = "Something went wrong. Please try again."
      setError(errorMsg)
      setSnackbar({ open: true, severity: "error", message: errorMsg })
    } finally {
      setLoading(false)
    }
  }

  // Handle close/open snackbar
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  }

  // set see password hide password
  const [showPassword, setShowPassword] = useState(false)

  return (
    <>
      <div>
        <div className="flex justify-center mm-auth-brand">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-[20px] h-[20px]" />
            <h2 className="text-lg">Maamara Market</h2>
          </div>
        </div>
        <Card className="mm-auth-card max-w-md mx-auto mt-10">
          <CardHeader className="mm-auth-header">
            <CardTitle className="mm-auth-title text-2xl">Create your account</CardTitle>
            <p className="mm-auth-subtitle text-sm">Join Maa Mara Market and discover local makers and products.</p>
          </CardHeader>

          <CardContent>
            {message && <p className="text-green-600 mb-4 mm-auth-success">{message}</p>}
            {error && <p className="text-red-600 mb-4 mm-auth-error">{error}</p>}

            {!otpSent ? (
              <form onSubmit={handleSubmit} className="mm-auth-form space-y-4">
                {[
                    { label: "First Name", name: "First_name" },
                    { label: "Surname", name: "Sur_name" },
                    { label: "Username", name: "username" },
                    { label: "Email", name: "email", type: "email" },
                    { label: "Password", name: "password" },
                    { label: "Confirm Password", name: "password2" },
                    { label: "Referral Code (optional)", name: "referral_code" }
                  ].map(({ label, name, type = "text" }) => (
                    <div key={name}>
                      <Label htmlFor={name}>{label}</Label>

                      {(name === "password" || name === "password2") ? (
                        <div className="relative">
                          <Input className="mm-auth-input"
                            id={name}
                            name={name}
                            type={showPassword ? "text" : "password"}
                            value={formData[name]}
                            onChange={handleChange}
                            required={name !== "referral_code"}
                          />

                          <button
                            type="button"
                            onClick={() => setShowPassword((prev) => !prev)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                          >
                            {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                          </button>
                        </div>
                      ) : (
                        <Input className="mm-auth-input"
                          id={name}
                          name={name}
                          type={type}
                          value={formData[name]}
                          onChange={handleChange}
                          required={name !== "referral_code"}
                        />
                      )}
                    </div>
                  ))}

                <Button
                  type="button"
                  variant="outline"
                  className="mm-auth-google w-full flex items-center justify-center gap-2 rounded-full"
                  onClick={() => {
                    window.location.href = `${baseUrl}/accounts/google/login/`
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.658 32.659 29.271 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
                    <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.254 0-9.657-3.657-11.284-8.583l-6.54 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.11 3.109-3.41 5.615-6.094 7.19l.002-.001 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.651-.389-3.917z"/>
                  </svg>
                  Continue with Google
                </Button>

                <div className="relative my-2 flex items-center"><span className="h-px flex-1 bg-[#e6e3de]" /><span className="px-3 text-xs text-[#6f6a63]">or continue with email</span><span className="h-px flex-1 bg-[#e6e3de]" /></div>              
                <div className="flex justify-center items-center w-full">
                  <Button type="submit" disabled={loading} className="primary-button w-full">
                  {loading ? "Registering..." : "Register"}
                </Button>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                ✅ OTP has been sent to your email. Please check your inbox to verify your account.
              </p>
            )}
          </CardContent>

          {otpSent && (
            <div className="mt-1">
              <OTPModal
                email={formData.email}
                expiresAt={expiryTime}  // ⏳ pass expiry to modal
                onVerify={() => {
                  setOtpSent(false)
                  setMessage("🎉 Account verified successfully!")
                  navigate("/customer-login")
                }}
              />
            </div>
          )}

          <CardFooter>
            <p className="text-xs text-muted-foreground mm-auth-legal">
              MaamaraMarket.com All rights reserved. <a href="/login" className="underline">Terms & Policies</a>.
            </p>
          </CardFooter>
        </Card>

        {/* MUI Snackbar */}
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
    </>
  )
}

export default RegistrationForm
