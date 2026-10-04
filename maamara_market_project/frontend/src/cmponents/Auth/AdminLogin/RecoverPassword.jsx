import { useState } from "react";
import { baseUrl } from "../../Constant/Constant";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage("");

    try {
      await fetch(`${baseUrl}/api/password-reset/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setMessage("If that email exists, a reset link has been sent.");
    } catch (err) {
      setMessage("Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen flex items-center justify-center px-4 py-10 bg-[var(--mm-page-bg)] font-[regular]">
      <div className="w-full max-w-[420px] p-6 sm:p-8 rounded-[var(--mm-radius-lg)] bg-[var(--mm-surface)] border border-[var(--mm-border)] shadow-[var(--mm-shadow-card)]">
        <h2 className="text-xl sm:text-2xl font-semibold text-[var(--mm-text)] mb-3 text-center">
          Forgot Password
        </h2>

        <p className="text-sm text-[var(--mm-text-muted)] text-center mb-6">
          Enter your email and we’ll send you a reset link.
        </p>

        <form onSubmit={handleSubmit} className="w-full">
          <label htmlFor="forgot-password-email" className="block mb-2 text-sm font-medium text-[var(--mm-text)]">
            Email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full min-h-[46px] px-4 py-3 rounded-full border border-[var(--mm-border)] bg-[var(--mm-surface)] text-[var(--mm-text)] text-sm outline-none transition focus:border-[var(--mm-border-strong)] focus:ring-2 focus:ring-black/5 disabled:opacity-60"
            disabled={loading}
            autoComplete="email"
          />

          <div className='flex justify-center items-center w-full'>
            <button
            type="submit"
            disabled={loading}
            className="primary-button w-full mt-6 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Sending...
              </>
            ) : (
              "Send Reset Link"
            )}
          </button>
          </div>

          {message && (
            <p className="text-sm mt-4 text-center text-[var(--mm-text-muted)]" role="status">
              {message}
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;
