import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import api from "../../../Services/Api";
import { CONTACT_EMAIL } from "./legalContent";

const errorText = (err, fallback) => err?.response?.data?.detail || fallback;

/**
 * Public account-deletion page (Google Play "web link" requirement).
 * Works without the app and without signing in: the user enters their account
 * email, we send a confirmation link, and opening it completes the deletion.
 */
export default function DeleteAccountPage() {
  const [params] = useSearchParams();
  const token = params.get("token");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);

  const run = async (fn) => {
    setBusy(true);
    setResult(null);
    try {
      const { data, status } = await fn();
      setResult({ ok: true, text: data.detail, review: status === 202 });
    } catch (err) {
      setResult({ ok: false, text: errorText(err, "Something went wrong. Please try again.") });
    } finally {
      setBusy(false);
    }
  };

  const box = "mx-auto max-w-xl px-4 py-10 text-gray-800 dark:text-gray-100";
  return (
    <main className={box}>
      <h1 className="text-2xl font-bold">Delete your Maa Mara Market account</h1>
      <p className="mt-2 text-sm text-gray-600 dark:text-gray-300">
        This page lets you request deletion of your Maa Mara Market account and its personal data without opening the app.
      </p>

      {token ? (
        <section className="mt-6 space-y-3">
          <p>Press the button to permanently delete your account. This cannot be undone.</p>
          <button disabled={busy || result?.ok} onClick={() => run(() => api.post("/api/account/deletion-request/confirm/", { token }))}
            className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50">
            Permanently delete my account
          </button>
        </section>
      ) : (
        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); run(() => api.post("/api/account/deletion-request/", { email })); }}>
          <label className="block">
            <span className="font-medium">Email address of your account</span>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 dark:border-gray-700 dark:bg-gray-800" />
          </label>
          <button disabled={busy} className="rounded-lg bg-red-600 px-4 py-2 font-semibold text-white disabled:opacity-50">Email me a confirmation link</button>
        </form>
      )}

      {result && (
        <p role="status" className={`mt-4 rounded-lg p-3 text-sm ${result.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-700"}`}>
          {result.text}{result.review ? " Our team will complete it within 30 days and email you." : ""}
        </p>
      )}

      <section className="mt-8 space-y-2 text-sm">
        <h2 className="text-lg font-semibold">What happens to your data</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Deleted immediately: your profile and picture, wallet and coins, vouchers, wishlist, reviews, comments, messages and saved Google or Apple sign-in links.</li>
          <li>Kept without your personal details: orders, payments, refunds and invoices, because tax and accounting law requires it.</li>
          <li>You get a confirmation email when it is done. If you have an order in progress you must wait until it completes.</li>
          <li>Vendor accounts have payouts to settle; we finish those requests within 30 days.</li>
        </ul>
        <p>Questions? Email <a className="underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. See our <Link className="underline" to="/privacy">Privacy Policy</Link>.</p>
      </section>
    </main>
  );
}
