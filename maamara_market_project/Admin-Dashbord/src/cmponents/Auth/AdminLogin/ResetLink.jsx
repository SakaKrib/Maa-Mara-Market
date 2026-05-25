import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { baseUrl } from "../../../cmponents/Constant/Constant";
import { Eye, EyeOff } from "lucide-react";


const ResetPassword = () => {
  const { uid, token } = useParams()
  const navigate = useNavigate()

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

   // set see password hide password
   const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) return

    // 🔐 validate match
    if (password !== confirmPassword) {
      setMessage("Passwords do not match")
      return
    }

    setLoading(true)
    setMessage("")

    try {
      const response = await fetch(
        `${baseUrl}/api/password-reset-confirm/${uid}/${token}/`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password }),
        }
      )

      const data = await response.json()

      if (data.success) {
        setMessage("Password reset successful. Redirecting to login...")

        setTimeout(() => {
          navigate("/customer-login")
        }, 2000)
      } else {
        setMessage(data.error || "Reset failed")
      }
    } catch (err) {
      setMessage("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">

      {/* CARD */}
      <div
        className="w-[380px] p-6 rounded-xl bg-white flex flex-col items-center"
        style={{
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        }}
      >

        <h2 className="text-xl font-semibold mb-4">
          Reset Password
        </h2>

        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your new password below.
        </p>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="w-full">

         <div className="relative">
             {/* PASSWORD */}
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 border rounded-md outline-none mb-3"
            disabled={loading}
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

         <div className="relative">
             {/* CONFIRM PASSWORD */}
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full p-2 border rounded-md outline-none"
            disabled={loading}
          />

            {/* Eye Icon */}
            {/* <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-600"
                >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button> */}
         </div>

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </button>
          </div>

          {message && (
            <p
              className={`text-sm mt-4 text-center ${
                message === "Passwords do not match"
                  ? "text-red-500"
                  : "text-green-600"
              }`}
            >
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default ResetPassword