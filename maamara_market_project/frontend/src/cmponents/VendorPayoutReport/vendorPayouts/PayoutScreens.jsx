import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { IonIcon } from "@ionic/react";
import { arrowBackOutline, checkmarkCircleOutline, timeOutline, alertCircleOutline } from "ionicons/icons";
import { useLocation, useNavigate } from "react-router-dom";
import api, { getWebSocketUrl } from "../../../Services/Api";
import AppSnackbar from "../../../../components/ui/app-snackbar";
import { useConfirmDialog } from "../../../../components/ui/confirm-dialog";

export const PAYOUTS_HOME = "/admin-dashboard/vendor-payout/payment-trigger";
export const payoutResultPath = (reference) => `${PAYOUTS_HOME}/payout-result/${encodeURIComponent(reference)}`;

const CHECK_EVERY_MS = 5000;

const formatKes = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const errorText = (err, fallback) => err?.response?.data?.error || err?.response?.data?.detail || fallback;

// ---------------------------------------------------------------------------
// Shared building blocks (same card/typography tokens as the payout list page)
// ---------------------------------------------------------------------------

export function PayoutPage({ title, subtitle, logo, children }) {
  const navigate = useNavigate();
  return (
    <section className="mx-auto min-w-0 max-w-4xl space-y-5 p-2 sm:p-4 lg:p-6">
      <button
        type="button"
        onClick={() => navigate(PAYOUTS_HOME)}
        className="inline-flex min-h-10 items-center gap-2 rounded-[20px] border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground transition hover:bg-muted"
      >
        <IonIcon icon={arrowBackOutline} />
        Back to payouts
      </button>

      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          {logo && (
            <img src={logo} alt="" className="h-11 w-11 shrink-0 rounded-xl border border-border bg-white object-contain p-1" />
          )}
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Vendor payments</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">{title}</h1>
            {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{subtitle}</p>}
          </div>
        </div>
      </header>

      {children}
    </section>
  );
}

// Every value on these screens is read-only: it is the data saved in the database.
export function ReadOnlyField({ label, value }) {
  const missing = !value || value === "Not saved";
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-semibold text-muted-foreground">{label}</span>
      <input
        readOnly
        tabIndex={-1}
        value={missing ? "Not saved" : value}
        className={`w-full cursor-not-allowed truncate rounded-xl border px-3 py-2.5 text-sm font-medium outline-none ${
          missing
            ? "border-destructive/40 bg-destructive/5 text-destructive"
            : "border-border bg-muted text-card-foreground"
        }`}
      />
    </label>
  );
}

const STATE_BADGES = {
  ready: { text: "Ready to pay", icon: checkmarkCircleOutline, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  paid: { text: "Paid", icon: checkmarkCircleOutline, cls: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" },
  submitted: { text: "Awaiting confirmation", icon: timeOutline, cls: "bg-amber-500/10 text-amber-700 dark:text-amber-300" },
  blocked: { text: "Needs attention", icon: alertCircleOutline, cls: "bg-destructive/10 text-destructive" },
};

const formatWhen = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleString("en-KE", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
};

const ACTION_LABELS = {
  send: "Send payment",
  request_approval: "Request approval",
  approve_and_send: "Approve and send",
  wait_for_other_admin: "Waiting for a second admin",
};

export function PayoutDetails({ item }) {
  const badge = STATE_BADGES[item.state] || STATE_BADGES.blocked;
  return (
    <article className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-base font-bold text-card-foreground">{item.vendor.company_name || "Vendor"}</p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.vendor.email || "No vendor email"}</p>
          {item.destination.summary && (
            <p className="mt-1 truncate text-xs font-medium text-card-foreground">{item.destination.summary}</p>
          )}
          <p className="mt-0.5 text-[10px] text-muted-foreground">{item.reference}</p>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${badge.cls}`}>
          <IonIcon icon={badge.icon} />
          {badge.text}
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {item.destination.fields.map((field) => (
          <ReadOnlyField key={field.label} label={field.label} value={field.value} />
        ))}
        <ReadOnlyField label="Payout amount" value={formatKes(item.amount)} />
        <ReadOnlyField label="Payout period" value={`${item.period_start} → ${item.period_end}`} />
        {item.security?.initiated_by && (
          <ReadOnlyField
            label="Last sent by"
            value={`${item.security.initiated_by}${item.security.initiated_at ? ` · ${formatWhen(item.security.initiated_at)}` : ""}`}
          />
        )}
        {item.security?.approved_by && (
          <ReadOnlyField
            label="Approved by"
            value={`${item.security.approved_by}${item.security.approved_at ? ` · ${formatWhen(item.security.approved_at)}` : ""}`}
          />
        )}
        {item.security?.approval?.state === "awaiting_second_admin" && (
          <ReadOnlyField
            label="Approval requested by"
            value={`${item.security.approval.requested_by}${item.security.approval.requested_at ? ` · ${formatWhen(item.security.approval.requested_at)}` : ""}`}
          />
        )}
      </div>

      {item.notes?.length > 0 && !item.paid && (
        <ul className="mt-4 space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-xs text-amber-700 dark:text-amber-300">
          {item.notes.map((note) => (
            <li key={note}>• {note}</li>
          ))}
        </ul>
      )}

      {item.warnings?.length > 0 && !item.paid && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-xs text-amber-800 dark:text-amber-200">
          <p className="font-semibold">Unusual — check before paying</p>
          <ul className="mt-1 space-y-1">
            {item.warnings.map((warning) => (
              <li key={warning}>• {warning}</li>
            ))}
          </ul>
        </div>
      )}

      {item.provider_failure && !item.paid && (
        <p className="mt-4 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs font-semibold text-destructive">
          {item.provider_failure}
        </p>
      )}

      {item.problems.length > 0 && !item.paid && (
        <ul className="mt-4 space-y-1 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-xs text-destructive">
          {item.problems.map((problem) => (
            <li key={problem}>• {problem}</li>
          ))}
        </ul>
      )}
    </article>
  );
}

export function AwaitingConfirmation({ item, waitedSeconds, checking, onCheck }) {
  const label = item.payment_method_label || "the provider";
  const slow = waitedSeconds >= 180;
  return (
    <article className="rounded-2xl border border-amber-500/40 bg-amber-500/5 p-4 shadow-sm sm:p-5" role="status">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-card-foreground">Waiting for {label} to confirm</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {label} has accepted this payment{item.submitted_at ? ` (sent ${formatWhen(item.submitted_at)})` : ""}. The final
            result arrives as a separate message from the provider to our server, usually within a minute. This page checks
            every few seconds and opens the success page as soon as the payment is confirmed. Do not send it again.
          </p>
          {slow && (
            <p className="mt-2 text-xs leading-5 text-amber-800 dark:text-amber-200">
              This is taking longer than usual. If it never completes, the server's result address for {label} may not be
              reachable from the internet. Check that the callback URLs in the server settings are public HTTPS addresses.
            </p>
          )}
          <button
            type="button"
            onClick={onCheck}
            disabled={checking}
            className="mt-3 inline-flex min-h-10 items-center justify-center rounded-[20px] border border-border bg-card px-4 py-2 text-xs font-semibold text-card-foreground transition hover:bg-muted disabled:opacity-50"
          >
            {checking ? "Checking…" : "Check status now"}
          </button>
        </div>
      </div>
    </article>
  );
}

const SendButton = ({ disabled, loading, onClick, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled || loading}
    className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
  >
    {loading ? (
      <>
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground" />
        Sending…
      </>
    ) : (
      children
    )}
  </button>
);

const LoadState = ({ loading, error, onRetry }) => {
  if (loading) {
    return <p className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">Loading payout details…</p>;
  }
  if (error) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-5 text-sm text-destructive">
        <p>{error}</p>
        <button type="button" onClick={onRetry} className="mt-3 rounded-full border border-destructive/40 px-3 py-1.5 text-xs font-semibold">
          Try again
        </button>
      </div>
    );
  }
  return null;
};

const useSnackbar = () => {
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });
  const show = (message, severity = "success") => setSnackbar({ open: true, message, severity });
  const node = (
    <AppSnackbar
      open={snackbar.open}
      message={snackbar.message}
      severity={snackbar.severity}
      onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
    />
  );
  return [show, node];
};

// ---------------------------------------------------------------------------
// One vendor
// ---------------------------------------------------------------------------

export function SinglePayoutScreen({ title, subtitle, logo, successPath, watchResult = false }) {
  const location = useLocation();
  const navigate = useNavigate();
  const reference =
    new URLSearchParams(location.search).get("reference") || location.state?.reference || "";

  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [showSnackbar, snackbarNode] = useSnackbar();
  const [confirm, confirmNode] = useConfirmDialog();
  const navigatedRef = useRef(false);
  const socketRef = useRef(null);
  const [checking, setChecking] = useState(false);
  const [waitedSeconds, setWaitedSeconds] = useState(0);

  const goToResult = useCallback(
    (payload) => {
      if (navigatedRef.current) return;
      navigatedRef.current = true;
      navigate(payoutResultPath(reference), { state: { payout: payload } });
    },
    [navigate, reference],
  );

  // Instant path: the server pushes the provider's result over a WebSocket.
  const openResultSocket = () => {
    try {
      socketRef.current?.close();
      const socket = new WebSocket(getWebSocketUrl(`/ws/payout/${reference}/`));
      socketRef.current = socket;
      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "payout_message") {
            socket.close();
            if (String(data.status || "").toLowerCase() === "success" || data.paid) goToResult(data);
            else load();
          }
        } catch {
          /* ignore malformed frames */
        }
      };
    } catch {
      /* polling below still picks the result up */
    }
  };

  useEffect(() => () => socketRef.current?.close(), []);

  const load = useCallback(async () => {
    if (!reference) {
      setLoading(false);
      setError("No payout was selected. Go back to payouts and choose Review & pay.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.get(`/api/admin/payouts/${encodeURIComponent(reference)}/review/`);
      setItem(res.data);
    } catch (err) {
      setError(errorText(err, "Unable to load this payout."));
    } finally {
      setLoading(false);
    }
  }, [reference]);

  useEffect(() => {
    load();
  }, [load]);

  // Reliable path: while the provider has not answered, re-read the saved payout.
  const refresh = useCallback(async () => {
    if (!reference) return null;
    try {
      const res = await api.get(`/api/admin/payouts/${encodeURIComponent(reference)}/review/`);
      setItem(res.data);
      if (res.data.state === "paid") goToResult(res.data);
      return res.data;
    } catch {
      return null;
    }
  }, [reference, goToResult]);

  const awaiting = item?.state === "submitted";
  useEffect(() => {
    if (!awaiting) {
      setWaitedSeconds(0);
      return undefined;
    }
    const timer = setInterval(() => {
      setWaitedSeconds((seconds) => seconds + CHECK_EVERY_MS / 1000);
      refresh();
    }, CHECK_EVERY_MS);
    return () => clearInterval(timer);
  }, [awaiting, refresh]);

  const checkNow = async () => {
    setChecking(true);
    await refresh();
    setChecking(false);
  };

  const handleSend = async () => {
    if (!item?.can_pay) return;
    const verb =
      item.action === "request_approval"
        ? "Request approval to send"
        : item.action === "approve_and_send"
          ? "Approve and send"
          : "Send";
    const ok = await confirm({
      title: `${verb} this payout?`,
      subtitle: item.vendor.company_name,
      rows: [
        ["Amount", formatKes(item.amount)],
        ["Vendor", item.vendor.company_name],
        ["Pays to", item.destination.summary],
      ],
      warnings: item.warnings || [],
      note: item.action === "request_approval"
        ? "This payout needs a second admin. A different admin must approve it before it is sent."
        : "The saved amount is paid to the saved destination. The provider must confirm settlement before it is marked paid.",
      confirmLabel: verb,
    });
    if (!ok) return;

    setSending(true);
    try {
      // Nothing but the reference is sent: the server pays the saved amount to the saved destination.
      const res = await api.post(`/api/vendor/payout/${encodeURIComponent(reference)}/pay/`);
      showSnackbar(res.data?.message || "Payout submitted.");

      if (watchResult) openResultSocket();
      await load();
    } catch (err) {
      showSnackbar(errorText(err, "The payout could not be submitted."), "error");
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <PayoutPage title={title} subtitle={subtitle} logo={logo}>
      {snackbarNode}
      {confirmNode}
      <LoadState loading={loading} error={error} onRetry={load} />
      {item && (
        <>
          {awaiting && <AwaitingConfirmation item={item} waitedSeconds={waitedSeconds} checking={checking} onCheck={checkNow} />}
          <PayoutDetails item={item} />
          <SendButton disabled={!item.can_pay} loading={sending} onClick={handleSend}>
            {ACTION_LABELS[item.action] || "Send payment"}
          </SendButton>
          <p className="text-center text-xs text-muted-foreground">
            The amount and destination come from the vendor's saved records and cannot be edited here.
          </p>
        </>
      )}
    </PayoutPage>
  );
}

// ---------------------------------------------------------------------------
// All unpaid vendors of one payment method (the exact set "Send all" pays)
// ---------------------------------------------------------------------------

export function GroupPayoutScreen({ method, title, subtitle, logo }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  const [results, setResults] = useState(null);
  const [showSnackbar, snackbarNode] = useSnackbar();
  const [confirm, confirmNode] = useConfirmDialog();

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.get("/api/admin/payouts/review/", { params: { payment_method: method } });
      setData(res.data);
    } catch (err) {
      setError(errorText(err, "Unable to load the payouts."));
    } finally {
      setLoading(false);
    }
  }, [method]);

  useEffect(() => {
    load();
  }, [load]);

  const summary = data?.summary;
  const items = useMemo(() => data?.items || [], [data]);

  const handleSendAll = async () => {
    if (!summary?.ready_count) return;
    const flagged = items.filter((i) => i.can_pay && i.warnings?.length).length;
    const needsApproval = items.some((i) => i.can_pay && i.action === "request_approval");
    const ok = await confirm({
      title: `Send all ${data.payment_method_label} payouts?`,
      subtitle: `Period ${data.period}`,
      rows: [
        ["Ready to pay", String(summary.ready_count)],
        ["Total", formatKes(summary.ready_amount)],
      ],
      warnings: flagged ? [`${flagged} of these payouts have unusual signals. Review them above first.`] : [],
      note: needsApproval ? "Large payouts will only be sent after a different admin approves them." : undefined,
      confirmLabel: "Send all",
    });
    if (!ok) return;

    setSending(true);
    setResults(null);
    try {
      const res = await api.post("/api/payout/process-payouts-by-group/", { payment_method: method });
      setResults(res.data?.results?.[method] || []);
      showSnackbar("Request processed. Review the results below.");
    } catch (err) {
      showSnackbar(errorText(err, "The payouts could not be submitted."), "error");
    } finally {
      setSending(false);
      await load();
    }
  };

  return (
    <PayoutPage title={title} subtitle={subtitle} logo={logo}>
      {snackbarNode}
      {confirmNode}
      <LoadState loading={loading} error={error} onRetry={load} />

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Period", data.period],
              ["Vendors", summary.count],
              ["Ready to pay", summary.ready_count],
              ["Ready value", formatKes(summary.ready_amount)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                <p className="mt-1 truncate text-sm font-bold text-card-foreground">{value}</p>
              </article>
            ))}
          </div>

          {items.length === 0 ? (
            <section className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground shadow-sm">
              No unpaid {data.payment_method_label} payouts for this period. Generate payouts first.
            </section>
          ) : (
            items.map((item) => <PayoutDetails key={item.reference} item={item} />)
          )}

          {results && results.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
              <h2 className="text-sm font-bold text-card-foreground">Submission results</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {results.map((row) => (
                  <li key={row.reference} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span className="font-medium text-card-foreground">{row.vendor}</span>
                    <span className={
                      /^(Failed|Exception|Blocked)/.test(String(row.status))
                        ? "text-destructive"
                        : String(row.status).startsWith("Awaiting")
                          ? "text-amber-700 dark:text-amber-300"
                          : "text-emerald-700 dark:text-emerald-300"
                    }>
                      {row.status}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <SendButton disabled={!summary.ready_count} loading={sending} onClick={handleSendAll}>
            Send all payments
          </SendButton>
          <p className="text-center text-xs text-muted-foreground">
            Amounts and destinations come from the saved vendor records and cannot be edited here. Vendors marked
            "Needs attention" are skipped or fail until their details are fixed.
          </p>
        </>
      )}
    </PayoutPage>
  );
}
