import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { helpCircleOutline, sendOutline, checkmarkCircleOutline } from "ionicons/icons";
import { Link } from "react-router-dom";
import api from "../../../Services/Api";
import { useAuth } from "../../../cmponents/Auth/AuthContext/Context";

const SUPPORT_ISSUES = [
  ["accounts", "Accounts"],
  ["login", "Logging in"],
  ["registration", "Registration / OTP"],
  ["orders", "Orders"],
  ["payments", "Payments"],
  ["shipping", "Shipping & delivery"],
  ["returns", "Returns & refunds"],
  ["products", "Products"],
  ["vendors", "Vendor / seller questions"],
  ["promotions", "Promotions & discounts"],
  ["technical", "Website / technical issue"],
  ["other", "Other / something else"],
];

const Support = () => {
  const { user } = useAuth();
  const [form, setForm] = useState({
    email: "",
    category: "",
    subject: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.email) {
      setForm((current) => ({ ...current, email: current.email || user.email }));
    }
  }, [user?.email]);

  const update = (field) => (event) => {
    setForm((current) => ({ ...current, [field]: event.target.value }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.email.trim() || !form.subject.trim() || !form.message.trim()) {
      setError("Email, subject, and message are required.");
      return;
    }

    try {
      setSending(true);
      await api.post("/api/support/inbox/", {
        email: form.email.trim(),
        category: form.category,
        subject: form.subject.trim(),
        message: form.message.trim(),
      });
      setSent(true);
      setForm((current) => ({
        ...current,
        category: "",
        subject: "",
        message: "",
      }));
    } catch (requestError) {
      setError(
        requestError?.response?.data?.detail ||
        requestError?.response?.data?.email?.[0] ||
        "We could not send your support request. Please try again."
      );
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <main className="min-h-[60vh] bg-background px-4 py-10 text-foreground sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl rounded-2xl border border-border bg-card p-8 text-center shadow-sm sm:p-12">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <IonIcon icon={checkmarkCircleOutline} className="text-3xl" />
          </div>
          <h1 className="mt-5 text-2xl font-semibold tracking-tight text-card-foreground">Support request received</h1>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-muted-foreground">
            Thanks for contacting Maa Mara Market. Our support team will review your message and reply to the email address you provided.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setSent(false)}
              className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
            >
              Send another request
            </button>
            <Link to="/faq" className="rounded-xl border border-border px-5 py-2.5 text-sm font-semibold text-card-foreground">
              Browse FAQs
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] bg-background px-4 py-8 text-foreground sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[0.75fr_1.25fr]">
        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-muted">
            <IonIcon icon={helpCircleOutline} className="text-xl text-card-foreground" />
          </div>
          <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer support</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-card-foreground sm:text-3xl">How can we help?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Tell us what you need help with. Choose a related issue or select Other and describe anything that is not listed.
          </p>

          <div className="mt-6 rounded-xl border border-border bg-muted/40 p-4">
            <p className="text-sm font-semibold text-card-foreground">Looking for a quick answer?</p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Check our frequently asked questions before sending a request.
            </p>
            <Link to="/faq" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">
              Browse frequently asked questions
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
          <form onSubmit={submit} className="space-y-5">
            <div>
              <label htmlFor="support-email" className="text-sm font-semibold text-card-foreground">Email</label>
              <input
                id="support-email"
                type="email"
                required
                value={form.email}
                onChange={update("email")}
                autoComplete="email"
                placeholder="you@example.com"
                className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-transparent px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="support-category" className="text-sm font-semibold text-card-foreground">What is this about?</label>
              <select
                id="support-category"
                value={form.category}
                onChange={update("category")}
                className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-card px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="">Choose a related issue</option>
                {SUPPORT_ISSUES.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="support-subject" className="text-sm font-semibold text-card-foreground">Subject</label>
              <input
                id="support-subject"
                type="text"
                required
                maxLength={255}
                value={form.subject}
                onChange={update("subject")}
                placeholder="Briefly describe your question"
                className="mt-2 min-h-11 w-full min-w-0 rounded-xl border border-border bg-transparent px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div>
              <label htmlFor="support-message" className="text-sm font-semibold text-card-foreground">Message</label>
              <textarea
                id="support-message"
                required
                rows={7}
                value={form.message}
                onChange={update("message")}
                placeholder="Tell us what happened or what you need help with..."
                className="mt-2 w-full resize-y rounded-xl border border-border bg-transparent p-4 text-sm leading-6 text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              <IonIcon icon={sendOutline} />
              {sending ? "Sending..." : "Send support request"}
            </button>
          </form>
        </section>
      </div>
    </main>
  );
};

export default Support;
