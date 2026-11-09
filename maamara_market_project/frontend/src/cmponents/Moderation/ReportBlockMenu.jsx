import { useEffect, useRef, useState } from "react";
import api from "../../Services/Api";

export const REPORT_REASONS = [
  { value: "spam", label: "Spam or scam" },
  { value: "harassment", label: "Harassment or bullying" },
  { value: "hate", label: "Hate speech" },
  { value: "sexual", label: "Sexual or inappropriate content" },
  { value: "violence", label: "Violence or dangerous content" },
  { value: "illegal", label: "Illegal goods or activity" },
  { value: "misleading", label: "False or misleading" },
  { value: "ip", label: "Copyright or counterfeit" },
  { value: "ai_harmful", label: "Harmful or inaccurate AI-generated content" },
  { value: "other", label: "Other" },
];

const errorText = (error, fallback) =>
  error?.response?.data?.detail || (error?.response?.status === 401 || error?.response?.status === 403
    ? "Please sign in to do this."
    : fallback);

/**
 * "Report" (and optionally "Block") control for any user-generated content.
 * targetType: review | blog_post | blog_comment | message | item | banner | user
 * ownerId: author's user id; when present the dialog offers "Block this user".
 */
export default function ReportBlockMenu({
  targetType,
  targetId,
  ownerId = null,
  ownerName = "this user",
  label = "Report",
  className = "",
  onBlocked,
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [alsoBlock, setAlsoBlock] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState({ text: "", error: false });
  const [done, setDone] = useState(false);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    dialogRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const close = () => {
    setOpen(false);
    setReason("");
    setDetails("");
    setAlsoBlock(false);
    setMessage({ text: "", error: false });
    setDone(false);
  };

  const blockUser = async () => {
    await api.post("/api/moderation/blocks/", { user_id: ownerId });
    onBlocked?.(ownerId);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    setMessage({ text: "", error: false });
    try {
      const { data } = await api.post("/api/moderation/reports/", {
        target_type: targetType,
        target_id: targetId,
        reason,
        details: details.trim(),
      });
      let text = data?.detail || "Thank you. Our team will review this report within 24 hours.";
      if (alsoBlock && ownerId) {
        try {
          await blockUser();
          text += ` ${ownerName} is blocked.`;
        } catch (blockError) {
          text += ` ${errorText(blockError, "We could not block this user.")}`;
        }
      }
      setMessage({ text, error: false });
      setDone(true);
    } catch (error) {
      setMessage({ text: errorText(error, "We could not send your report. Please try again."), error: true });
    } finally {
      setBusy(false);
    }
  };

  const blockOnly = async () => {
    if (!ownerId || busy) return;
    setBusy(true);
    try {
      await blockUser();
      setMessage({ text: `${ownerName} is blocked. You will no longer see their posts.`, error: false });
      setDone(true);
    } catch (error) {
      setMessage({ text: errorText(error, "We could not block this user."), error: true });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className || "text-xs font-semibold text-muted-foreground underline-offset-2 hover:text-card-foreground hover:underline focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"}
        aria-haspopup="dialog"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4" onClick={close}>
          <div
            ref={dialogRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Report content"
            onClick={(event) => event.stopPropagation()}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-t-2xl bg-card p-5 text-card-foreground shadow-xl outline-none sm:rounded-2xl"
          >
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-bold">Report or block</h2>
              <button type="button" onClick={close} aria-label="Close" className="rounded-full px-2 text-lg leading-none text-muted-foreground hover:text-card-foreground">×</button>
            </div>

            {done ? (
              <div className="mt-4 space-y-4">
                <p role="status" className="text-sm">{message.text}</p>
                <button type="button" onClick={close} className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white">Done</button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-3 space-y-4">
                <fieldset>
                  <legend className="text-sm font-semibold">Why are you reporting this?</legend>
                  <div className="mt-2 space-y-1.5">
                    {REPORT_REASONS.map((item) => (
                      <label key={item.value} className="flex cursor-pointer items-center gap-2 text-sm">
                        <input type="radio" name="report-reason" value={item.value} checked={reason === item.value} onChange={() => setReason(item.value)} />
                        {item.label}
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block text-sm">
                  <span className="font-semibold">Details (optional)</span>
                  <textarea
                    rows={3}
                    maxLength={1000}
                    value={details}
                    onChange={(event) => setDetails(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-border"
                  />
                </label>
                {ownerId ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={alsoBlock} onChange={(event) => setAlsoBlock(event.target.checked)} />
                    Also block {ownerName} (hide their posts from me)
                  </label>
                ) : null}
                {message.text && <p role="alert" className={`text-xs ${message.error ? "text-destructive" : ""}`}>{message.text}</p>}
                <div className="flex flex-col gap-2">
                  <button type="submit" disabled={!reason || busy} className="w-full rounded-full bg-black px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
                    {busy ? "Sending…" : "Send report"}
                  </button>
                  {ownerId ? (
                    <button type="button" onClick={blockOnly} disabled={busy} className="w-full rounded-full border border-border px-4 py-2.5 text-sm font-semibold disabled:opacity-50">
                      Block {ownerName} only
                    </button>
                  ) : null}
                </div>
                <p className="text-xs text-muted-foreground">Reports go to our moderation team, who review them within 24 hours. The person you report is not told who reported them.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
