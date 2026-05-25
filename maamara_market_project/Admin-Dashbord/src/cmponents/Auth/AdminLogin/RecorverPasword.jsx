import { useState } from "react"
import { baseUrl } from "../../Constant/Constant"

const ForgotPassword = () => {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (loading) return

    setLoading(true)
    setMessage("")

    try {
      await fetch(`${baseUrl}/api/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      setMessage("If that email exists, a reset link has been sent.")
    } catch (err) {
      setMessage("Something went wrong. Try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full h-screen flex items-center justify-center bg-gray-100">

      <div
        className="w-[380px] p-6 rounded-xl bg-white flex flex-col items-center"
        style={{
          boxShadow: "0 10px 30px rgba(0, 0, 0, 0.08)",
        }}
      >

        <h2 className="text-xl font-semibold mb-4">
          Forgot Password
        </h2>

        <p className="text-sm text-gray-500 text-center mb-6">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded-md outline-none"
            disabled={loading}
          />

          <div className="flex justify-center mt-6">
            <button
              type="submit"
              disabled={loading}
              className="primary-button w-full flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  Sending...
                </>
              ) : (
                "Send Reset Link"
              )}
            </button>
          </div>

          {message && (
            <p className="text-green-600 text-sm mt-4 text-center">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  )
}

export default ForgotPassword