import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { baseUrl } from "../src/cmponents/Constant/Constant"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../src/cmponents/Auth/AuthContext/Context"
import Maamara from "../src/assets/Logo/Maamara.jpg"
import { Eye, EyeOff } from "lucide-react"

// Fetch the CSRF token returned by Django. The frontend origin cannot reliably
// read a backend-origin csrftoken cookie with document.cookie.
const getCsrfToken = async () => {
  const response = await fetch(`${baseUrl}/api/get-csrf-token/`, {
    method: "GET",
    credentials: "include"
  })

  if (!response.ok) {
    throw new Error(`CSRF token request failed with status ${response.status}`)
  }

  const data = await response.json()
  return data.csrfToken || ""
}

export function LoginForm({ className, ...props }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const [csrfReady, setCsrfReady] = useState(false)
  const [loading, setLoading] = useState(false)

  // set see password hide password
  const [showPassword, setShowPassword] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const { refreshAuth } = useAuth()
  
  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, message: "" })

  // Get redirect path after login (fallback to home page)
  const from = location.state?.from || "/"

  useEffect(() => {
    getCsrfToken()
      .then(token => {
        setCsrfToken(token)
        setCsrfReady(Boolean(token))
      })
      .then(() => {
      .catch(err => {
        console.error("CSRF fetch error:", err)
        setCsrfReady(false)
      })
  }, [])

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSnackbar({ open: false, message: "" })

    if (!username || !password) {
      const msg = "Both username and password are required."
      setError(msg)
      setSnackbar({ open: true, message: msg })
      return
    }

    if (!csrfReady || !csrfToken) {
      const msg = "Security token is still loading. Please try again."
      setError(msg)
      setSnackbar({ open: true, message: msg })
      return
    }

    setLoading(true)

    const formData = new FormData()
    formData.append("username", username)
    formData.append("password", password)

    try {
      const response = await fetch(`${baseUrl}/api/login/`, {
        method: "POST",
        body: formData,
        credentials: "include",
        headers: { "X-CSRFToken": csrfToken }
      })

      const contentType = response.headers.get("content-type")

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Login request failed with status ${response.status}:`, errorText)

        let serverMessage = ""
        try {
          const errorData = errorText ? JSON.parse(errorText) : null
          serverMessage =
            errorData?.error ||
            errorData?.detail ||
            errorData?.message ||
            ""
        } catch {
          // The response was not JSON; use the status-specific message below.
        }

        let msg
        if (response.status === 401) {
          msg = "Invalid username or password. Please check your credentials and try again."
        } else if (response.status === 403) {
          msg = "You are not authorized to log in with these credentials."
        } else if (response.status === 404) {
          msg = "Login service was not found. Please try again later."
        } else if (response.status >= 500) {
          msg = "A server error occurred while logging you in. Please try again later."
        } else {
          msg = serverMessage || `Login failed (error ${response.status}). Please try again.`
        }

        setError(msg)
        setSnackbar({ open: true, message: msg })
        return
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        if (data.success) {
          setUsername("")
          setPassword("")

          // Django has established the authenticated HttpOnly cookies.
          // Synchronize AuthContext with the server before navigating.
          await refreshAuth()

          console.log("Redirecting to:", from)
          navigate(from, { replace: true })
        } else {
          const msg = data.error || "Login failed. Please try again."
          setError(msg)
          setSnackbar({ open: true, message: msg })
        }
      } else {
        const text = await response.text()
        console.error("Unexpected response format:", text)
        const msg = "Unexpected server response. Please contact support."
        setError(msg)
        setSnackbar({ open: true, message: msg })
      }
    } catch (err) {
      console.error("Fetch error:", err)
      const msg = "Something went wrong. Please try again later."
      setError(msg)
      setSnackbar({ open: true, message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex justify-center mm-auth-brand">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-[20px] h-[20px]" />
            <h2 className="text-lg">Maamara Market</h2>
          </div>
        </div>

        <Card className="mm-auth-card overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-2 xxs:grid-cols-1">
            <form onSubmit={handleSubmit} className="mm-auth-form-panel p-6 md:p-8 ">
              <div className="mm-auth-form flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold mm-auth-title">Welcome back</h1>
                  <p className="text-balance xxs:text-sm text-muted-foreground mm-auth-subtitle">
                    Login to your Maamara Market account
                  </p>
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="flex flex-col">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="user123"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <Link to='/forgot-password' className="ml-auto text-sm underline-offset-2 hover:underline">
                      Forgot your password?
                    </Link>
                  </div>
                  
                  {/* password board */}
                  <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="off"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />

                   {/* Eye Icon */}
                   <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                </div>

                {/* google login */}
                {/* Google Login Button */}
                  <Button
                    type="button"
                    variant="outline"
                    className="mm-auth-google w-full flex items-center justify-center gap-2"
                    onClick={() => {
                      sessionStorage.setItem("postLoginRedirect", from)
                      window.location.href = `${baseUrl}/accounts/google/login/`
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 48 48">
                      <path
                        fill="#FFC107"
                        d="M43.611 20.083H42V20H24v8h11.303C33.658 32.659 29.271 36 24 36
                        c-6.627 0-12-5.373-12-12s5.373-12 12-12
                        c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657
                        C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24
                        s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
                      />
                      <path
                        fill="#FF3D00"
                        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12
                        c3.059 0 5.842 1.154 7.957 3.043l5.657-5.657
                        C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
                      />
                      <path
                        fill="#4CAF50"
                        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238
                        C29.211 35.091 26.715 36 24 36
                        c-5.254 0-9.657-3.657-11.284-8.583l-6.54 5.025
                        C9.505 39.556 16.227 44 24 44z"
                      />
                      <path
                        fill="#1976D2"
                        d="M43.611 20.083H42V20H24v8h11.303
                        c-1.11 3.109-3.41 5.615-6.094 7.19l.002-.001
                        6.19 5.238C36.971 39.205 44 34 44 24
                        c0-1.341-.138-2.651-.389-3.917z"
                      />
                    </svg>

                    Continue with Google
                  </Button>

                <Button type="submit" className="mm-auth-submit w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="mm-auth-link underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>

            <div className="mm-auth-visual relative mobile-hide md:block">
              <img
                src={Maamara}
                alt="Login visual"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mm-auth-legal text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <a href="#" className="underline underline-offset-4">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="#" className="underline underline-offset-4">
            Privacy Policy
          </a>.
        </div>
      </div>

      {snackbar.open && (
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
      )}
    </>
  )
}