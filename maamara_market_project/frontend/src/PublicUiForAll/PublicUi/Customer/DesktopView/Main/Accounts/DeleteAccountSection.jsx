import React, { useState } from "react";
import { Trash2, Loader2, X } from "lucide-react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";

const errorText = (err, fallback) =>
  err?.response?.data?.detail || err?.response?.data?.error || fallback;

/** Delete-account entry point (App Store 5.1.1(v) / Google Play account deletion). */
export default function DeleteAccountSection() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [confirm, setConfirm] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const openDialog = async () => {
    setOpen(true);
    setError("");
    setMessage("");
    setLoading(true);
    try {
      const { data } = await api.get("/api/account/delete/info/");
      setInfo(data);
    } catch (err) {
      setError(errorText(err, "We could not load your account details. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    setPassword("");
    setCode("");
    setConfirm("");
    setCodeSent(false);
  };

  const sendCode = async () => {
    setBusy(true);
    setError("");
    try {
      const { data } = await api.post("/api/account/delete/send-code/");
      setCodeSent(true);
      setMessage(`${data.detail} (${data.email})`);
    } catch (err) {
      setError(errorText(err, "We could not send the code."));
    } finally {
      setBusy(false);
    }
  };

  const deleteAccount = async () => {
    setBusy(true);
    setError("");
    try {
      await api.post("/api/account/delete/", { confirm, password, code });
      try { window.localStorage.clear(); } catch { /* storage unavailable */ }
      window.location.assign("/");
    } catch (err) {
      setError(errorText(err, "We could not delete your account. Please try again."));
      setBusy(false);
    }
  };

  const blocked = info?.blockers?.length > 0;
  const ready =
    info && !blocked && confirm.trim().toUpperCase() === "DELETE" &&
    (info.has_password ? password.length > 0 : code.length === 6);

  return (
    <>
      <div className="mm-account-section rounded-xl border border-red-200 bg-red-50 p-4 md:p-5 space-y-3 dark:border-red-900 dark:bg-red-950/30">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-red-700 dark:text-red-300">
          <Trash2 className="h-5 w-5" /> Delete account
        </h3>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          Permanently delete your account and personal data. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={openDialog}
          className="rounded-lg border border-red-600 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-100 dark:text-red-300 dark:hover:bg-red-900/40"
          data-testid="delete-account-open"
        >
          Delete my account
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Delete account">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-white p-5 shadow-xl dark:bg-gray-900 sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100">Delete your account?</h2>
              <button type="button" onClick={close} aria-label="Close" className="rounded p-1 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5" /></button>
            </div>

            {loading && <p className="mt-4 flex items-center gap-2 text-sm text-gray-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading…</p>}

            {info && (
              <div className="mt-3 space-y-3 text-sm text-gray-700 dark:text-gray-300">
                <ul className="list-disc space-y-1 pl-5">
                  {info.retention.map((line) => <li key={line}>{line}</li>)}
                </ul>
                <p>
                  Details are in our <Link to="/privacy" className="underline" onClick={close}>Privacy Policy</Link>.
                  You can also request deletion from the web at <Link to="/delete-account" className="underline" onClick={close}>/delete-account</Link>.
                </p>

                {blocked ? (
                  <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-amber-900">
                    {info.blockers.map((reason) => <p key={reason}>{reason}</p>)}
                  </div>
                ) : (
                  <>
                    {info.has_password ? (
                      <label className="block">
                        <span className="font-medium">Enter your password</span>
                        <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
                          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
                      </label>
                    ) : (
                      <div className="space-y-2">
                        <p>For your security we will email a code to {info.email}.</p>
                        <button type="button" onClick={sendCode} disabled={busy} className="rounded-lg border border-gray-300 px-3 py-2 font-medium hover:bg-gray-50 disabled:opacity-60 dark:border-gray-700 dark:hover:bg-gray-800">
                          {codeSent ? "Send a new code" : "Email me a code"}
                        </button>
                        <input inputMode="numeric" maxLength={6} placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 tracking-widest dark:border-gray-700 dark:bg-gray-800" />
                      </div>
                    )}
                    <label className="block">
                      <span className="font-medium">Type DELETE to confirm</span>
                      <input value={confirm} onChange={(e) => setConfirm(e.target.value)} autoCapitalize="characters"
                        className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
                    </label>
                  </>
                )}
              </div>
            )}

            {message && <p className="mt-3 text-sm text-green-700">{message}</p>}
            {error && <p className="mt-3 text-sm text-red-600" role="alert">{error}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={close} className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800">Cancel</button>
              {!blocked && (
                <button type="button" onClick={deleteAccount} disabled={!ready || busy}
                  className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50" data-testid="delete-account-confirm">
                  {busy && <Loader2 className="h-4 w-4 animate-spin" />} Delete permanently
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
