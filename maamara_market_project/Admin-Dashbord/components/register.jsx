import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import OTPModal from "./OtpModal"
import { baseUrl } from "../src/cmponents/Constant/Constant";
import { useNavigate } from "react-router-dom";

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
        setOtpSent(true)
        setExpiryTime(data.expires_at)  // ✅ store expiry time
      } else {
        setError(data.message || "Registration failed.")
      }
    } catch (err) {
      console.error("Registration error:", err)
      setError("Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Card className="max-w-md mx-auto mt-10">
        <CardHeader>
          <CardTitle>Register</CardTitle>
        </CardHeader>

        <CardContent>
          {message && <p className="text-green-600 mb-4">{message}</p>}
          {error && <p className="text-red-600 mb-4">{error}</p>}

          {!otpSent ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              {[
                { label: "First Name", name: "First_name" },
                { label: "Surname", name: "Sur_name" },
                { label: "Username", name: "username" },
                { label: "Email", name: "email", type: "email" },
                { label: "Password", name: "password", type: "password" },
                { label: "Confirm Password", name: "password2", type: "password" },
                { label: "Referral Code (optional)", name: "referral_code" }
              ].map(({ label, name, type = "text" }) => (
                <div key={name}>
                  <Label htmlFor={name}>{label}</Label>
                  <Input
                    id={name}
                    name={name}
                    type={type}
                    value={formData[name]}
                    onChange={handleChange}
                    required={name !== "referral_code"}
                  />
                </div>
              ))}

              <Button type="submit" disabled={loading || !csrfToken} className="w-full">
                {loading ? "Registering..." : "Register"}
              </Button>
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
          <p className="text-xs text-muted-foreground">
            MaamaraMarket.com All rights reserved. <a href="/login" className="underline">Terms & Policies</a>.
          </p>
        </CardFooter>
      </Card>
    </>
  )
}

export default RegistrationForm
