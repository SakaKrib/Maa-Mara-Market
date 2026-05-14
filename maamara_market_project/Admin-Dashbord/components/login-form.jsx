import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { baseUrl } from "../src/cmponents/Constant/Constant"
import { useNavigate, useLocation } from "react-router-dom"
import { useAuth } from "../src/cmponents/Auth/AuthContext/Context"
import Maamara from "../src/assets/Logo/Maamara.jpg"
import Snackbar from '@mui/material/Snackbar'
import Alert from '@mui/material/Alert'

// Helper: Get CSRF token from cookie
const getCookie = (name) => {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop().split(";").shift()
  return ""
}

export function LoginForm({ className, ...props }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const [loading, setLoading] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAuth()
  

  // Snackbar state
  const [snackbar, setSnackbar] = useState({ open: false, severity: "error", message: "" })

  // Get redirect path after login (fallback to home page)
  const from = location.state?.from || "/"

  useEffect(() => {
    fetch(`${baseUrl}/api/get-csrf-token/`, {
      method: "GET",
      credentials: "include"
    })
      .then(() => {
        const token = getCookie("csrftoken")
        setCsrfToken(token)
      })
      .catch(err => console.error("CSRF fetch error:", err))
  }, [])

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSnackbar({ open: false, severity: "error", message: "" })

    if (!username || !password) {
      const msg = "Both username and password are required."
      setError(msg)
      setSnackbar({ open: true, severity: "error", message: msg })
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
        console.error("Server error:", errorText)
        const msg = "Login failed. Server returned an error."
        setError(msg)
        setSnackbar({ open: true, severity: "error", message: msg })
        return
      }

      if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        if (data.success) {
          login(data.user) // update auth context
          setUsername("")
          setPassword("")
          console.log("Redirecting to:", from)
          // Redirect to previous page (or fallback)
          navigate(from, { replace: true })
        } else {
          const msg = data.error || "Login failed. Please try again."
          setError(msg)
          setSnackbar({ open: true, severity: "error", message: msg })
        }
      } else {
        const text = await response.text()
        console.error("Unexpected response format:", text)
        const msg = "Unexpected server response. Please contact support."
        setError(msg)
        setSnackbar({ open: true, severity: "error", message: msg })
      }
    } catch (err) {
      console.error("Fetch error:", err)
      const msg = "Something went wrong. Please try again later."
      setError(msg)
      setSnackbar({ open: true, severity: "error", message: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <div className="flex justify-center">
          <div className="flex gap-4 items-center">
            <img src={Maamara} alt="maamara-logo" className="w-[20px] h-[20px]" />
            <h2 className="text-lg">Maamara Market</h2>
          </div>
        </div>

        <Card className="overflow-hidden">
          <CardContent className="grid p-0 md:grid-cols-2">
            <form onSubmit={handleSubmit} className="p-6 md:p-8">
              <div className="flex flex-col gap-6">
                <div className="flex flex-col items-center text-center">
                  <h1 className="text-2xl font-bold">Welcome back</h1>
                  <p className="text-balance text-muted-foreground">
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
                    <a href="#" className="ml-auto text-sm underline-offset-2 hover:underline">
                      Forgot your password?
                    </a>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </Button>

                <div className="text-center text-sm">
                  Don&apos;t have an account?{" "}
                  <a href="/register" className="underline underline-offset-4">
                    Sign up
                  </a>
                </div>
              </div>
            </form>

            <div className="relative hidden bg-muted md:block">
              <img
                src={Maamara}
                alt="Login visual"
                className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
              />
            </div>
          </CardContent>
        </Card>

        <div className="text-center text-xs text-muted-foreground">
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

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
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
    </>
  )
}