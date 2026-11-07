import React from "react"
import { useState, useEffect } from "react"
import { cn } from "../lib/utils"
import { Button } from "./ui/button"
import { Card, CardContent } from "./ui/card"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import api, { startAppleLogin, getVisitorIdentity } from "../src/Services/Api"
import { Capacitor } from "@capacitor/core"
import { SocialLogin } from "@capgo/capacitor-social-login"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { useAuth } from "../src/cmponents/Auth/AuthContext/Context"
import { Eye, EyeOff } from "lucide-react"
import { FaApple } from "react-icons/fa"
import AppSnackbar from "./ui/app-snackbar";

// Fetch the CSRF token returned by Django. The frontend origin cannot reliably
// read a backend-origin csrftoken cookie with document.cookie.
const getCsrfToken = async () => {
  const response = await api.get("/api/get-csrf-token/")

  if (!response.data) {
    throw new Error("CSRF token request returned no data")
  }

  const data = response.data
  return data.csrfToken || ""
}


let googleIdentityScriptPromise = null;
let nativeGoogleInitialization = null;

const loadGoogleIdentityScript = async () => {
  if (window.google?.accounts?.id) return;
  if (!googleIdentityScriptPromise) {
    googleIdentityScriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        googleIdentityScriptPromise = null;
        reject(new Error("Unable to load Google sign-in."));
      };
      document.head.appendChild(script);
    });
  }
  await googleIdentityScriptPromise;
};

export function LoginForm({ className, ...props }) {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [csrfToken, setCsrfToken] = useState("")
  const [csrfReady, setCsrfReady] = useState(false)
  const [loading, setLoading] = useState(false)
  const [socialProviders, setSocialProviders] = useState({ google: false, apple: false })

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
      .catch(err => {
        console.error("CSRF fetch error:", err)
        setCsrfReady(false)
      })
  }, [])

  useEffect(() => {
    api.get("/api/auth/providers/")
      .then(({ data }) => {
        setSocialProviders({ google: Boolean(data?.google), apple: Boolean(data?.apple) })
      })
      .catch(err => {
        // Fail closed: provider buttons stay disabled until Django confirms configuration.
        console.warn("Social sign-in availability check failed:", err)
      })
  }, [])

  const handleSnackbarClose = () => {
    setSnackbar(prev => ({ ...prev, open: false }))
  }

  const handleGoogleLogin = async () => {
    if (!socialProviders.google || loading) return;

    setError("");
    setSnackbar({ open: false, message: "" });
    setLoading(true);

    try {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
      const iosClientId = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID?.trim();
      if (!clientId) {
        throw new Error("Google sign-in is not configured for this build. Please contact support.");
      }

      sessionStorage.setItem("postLoginRedirect", from);

      const exchangeCredential = async (credential) => {
        const visitorId = getVisitorIdentity();
        const { data } = await api.post("/api/google/login/", {
          credential,
          ...(visitorId ? { visitorId } : {}),
        });

        if (!data?.success || !data?.authenticated || !data?.user) {
          throw new Error(data?.error || "We couldn’t complete Google sign-in.");
        }

        const authData = await refreshAuth();
        if (!authData?.isAuthenticated || !authData?.user) {
          throw new Error("Google accepted your account, but Maa Mara could not confirm your signed-in session. Please try again.");
        }

        navigate(from, { replace: true });
      };

      if (Capacitor.isNativePlatform()) {
        const platform = Capacitor.getPlatform();
        if (platform === "ios" && !iosClientId) {
          throw new Error("Google sign-in on iOS needs the Maa Mara iOS OAuth Client ID configured.");
        }

        if (!nativeGoogleInitialization) {
          nativeGoogleInitialization = SocialLogin.initialize({
            google: {
              webClientId: clientId,
              ...(platform === "ios"
                ? { iOSClientId: iosClientId, iOSServerClientId: clientId }
                : {}),
              mode: "online",
            },
          }).catch((error) => {
            nativeGoogleInitialization = null;
            throw error;
          });
        }
        await nativeGoogleInitialization;

        const nativeResponse = await SocialLogin.login({
          provider: "google",
          options: {
            scopes: ["email", "profile"],
            filterByAuthorizedAccounts: false,
          },
        });
        const credential = nativeResponse?.result?.idToken;
        if (!credential) {
          throw new Error("Google did not return a valid identity token.");
        }
        await exchangeCredential(credential);
        return;
      }

      await loadGoogleIdentityScript();
      const google = window.google;
      if (!google?.accounts?.id) {
        throw new Error("Google sign-in is unavailable. Please try again.");
      }

      await new Promise((resolve, reject) => {
        let settled = false;
        const finish = (error) => {
          if (settled) return;
          settled = true;
          error ? reject(error) : resolve();
        };

        google.accounts.id.initialize({
          client_id: clientId,
          ux_mode: "popup",
          callback: async (response) => {
            try {
              if (!response?.credential) {
                finish(new Error("Google did not return an identity token."));
                return;
              }
              await exchangeCredential(response.credential);
              finish();
            } catch (error) {
              finish(error);
            }
          },
        });

        google.accounts.id.prompt((notification) => {
          if (
            notification?.isNotDisplayed?.() ||
            notification?.isSkippedMoment?.()
          ) {
            finish(new Error("Google sign-in could not open. Please check the Google OAuth web origin configuration and try again."));
          }
        });
      });
    } catch (err) {
      console.error("Maa Mara Google sign-in failed:", err);
      const msg =
        err?.response?.data?.error ||
        err?.message ||
        "Unable to complete Google sign-in. Please try again.";
      setError(msg);
      setSnackbar({ open: true, message: msg });
    } finally {
      setLoading(false);
    }
  }

  const handleAppleLogin = async () => {
    if (!socialProviders.apple) return;
    try {
      sessionStorage.setItem("postLoginRedirect", from);
      await startAppleLogin();
    } catch (err) {
      const msg = "Apple sign-in is not configured yet. Please use email or Google for now.";
      setError(msg);
      setSnackbar({ open: true, message: msg });
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    setSnackbar({ open: false, message: "" })

    if (!username || !password) {
      const msg = "Email/username and password are required."
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
    // The visitor cookie may not be included by native WebViews. Send the
    // in-memory server-issued ID so the backend can merge guest cart/wishlist.
    const visitorId = getVisitorIdentity()
    if (visitorId) formData.append("visitorId", visitorId)

    try {
      const response = await api.post("/api/login/", formData, {
        headers: { "X-CSRFToken": csrfToken }
      })

      const data = response.data
      if (!data?.success) {
        const msg = data?.error || data?.detail || "Login failed. Please try again."
        setError(msg)
        setSnackbar({ open: true, message: msg })
        return
      }

      setUsername("")
      setPassword("")
      const authData = await refreshAuth()
      if (!authData?.isAuthenticated || !authData?.user) {
        const msg = "Your credentials were accepted, but we could not confirm your signed-in session. Please try again."
        setError(msg)
        setSnackbar({ open: true, message: msg })
        return
      }

      // Keep all account types on the customer homepage after login.
      // Dashboard navigation is left to the user.
      navigate("/", { replace: true })
    } catch (err) {
      const status = err.response?.status
      let msg = "Something went wrong. Please try again later."

      if (status === 401) {
        msg = err.response?.data?.error === "Invalid credentials" ? "Invalid email/username or password. Please check your credentials and try again." : (err.response?.data?.error || "Invalid email/username or password. Please check your credentials and try again.")
      } else if (status === 403) {
        msg = "You are not authorized to log in with these credentials."
      } else if (status >= 500) {
        msg = "A server error occurred while logging you in. Please try again later."
      }

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
            <img src={`${import.meta.env.BASE_URL}maamara-brand-artwork.svg`} alt="Maa Mara Market" className="h-7 w-7 rounded-md object-contain" />
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
                  <Label htmlFor="username">Email or username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="name@example.com or username"
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
                    onClick={handleGoogleLogin}
                    disabled={!socialProviders.google || loading}
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

                  <Button
                    type="button"
                    variant="outline"
                    className="mm-auth-apple w-full flex items-center justify-center gap-2"
                    onClick={handleAppleLogin}
                    disabled={!socialProviders.apple}
                    title={!socialProviders.apple ? "Apple sign-in will be available after Apple credentials are configured." : "Continue with Apple"}
                    aria-label="Continue with Apple"
                  >
                    <FaApple size={18} aria-hidden="true" />
                    Continue with Apple
                  </Button>

                <div className="relative flex items-center text-xs text-muted-foreground">
                  <span className="h-px flex-1 bg-border" />
                  <span className="px-3">or continue with email</span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <Button type="submit" className="mm-auth-submit w-full" disabled={loading}>
                  {loading ? "Continuing..." : "Continue with email"}
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
                src={`${import.meta.env.BASE_URL}maamara-brand-artwork.svg`}
                alt="Maa Mara Market artwork"
                className="absolute inset-0 h-full w-full bg-[#FFBFBF] object-contain"
              />
            </div>
          </CardContent>
        </Card>

        <div className="mm-auth-legal text-center text-xs text-muted-foreground">
          By clicking continue, you agree to our{" "}
          <Link to="/terms" className="underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>.
        </div>
      </div>

      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleSnackbarClose} />
    </>
  )
}