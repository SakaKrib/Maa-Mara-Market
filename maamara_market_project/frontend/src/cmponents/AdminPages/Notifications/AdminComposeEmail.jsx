import { useEffect, useState } from "react";
import { X, Paperclip, Trash2, Send, LoaderCircle, Mail, Users } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import api from "../../../Services/Api";
import { useSendEmail } from "../../Hooks/Emails/EmailSending";
import AppSnackbar from "../../../../components/ui/app-snackbar";

const emptyForm = { to: "", subject: "", message: "" };

const fieldClass =
  "mt-1.5 block min-h-12 w-full rounded-[20px] border border-border bg-background px-2 py-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-60";

const ComposeEmail = ({ open, onClose, user = null }) => {
  const { sendEmail, loading } = useSendEmail();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [attachments, setAttachments] = useState([]);
  const [notice, setNotice] = useState({ open: false, severity: "success", message: "" });

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    api.get("/api/email-users/")
      .then(({ data }) => {
        if (active) setUsers(Array.isArray(data) ? data : (data?.results || []));
      })
      .catch(() => {
        if (active) setUsers([]);
      });
    return () => { active = false; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, to: user?.email || "" });
    setAttachments([]);
  }, [open, user]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) onClose?.();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, loading, onClose]);

  const updateField = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const handleFiles = (event) => {
    setAttachments((previous) => [...previous, ...Array.from(event.target.files || [])]);
    event.target.value = "";
  };

  const handleSend = async (event) => {
    event.preventDefault();
    if (!form.to.trim() || !form.subject.trim() || !form.message.trim()) {
      setNotice({ open: true, severity: "warning", message: "Enter a recipient, subject, and message." });
      return;
    }

    const payload = new FormData();
    payload.append("to", form.to.trim());
    payload.append("subject", form.subject.trim());
    payload.append("message", form.message);
    attachments.forEach((file) => payload.append("attachments", file));

    const result = await sendEmail(payload);
    if (!result) {
      setNotice({ open: true, severity: "error", message: "Could not send the email. Please try again." });
      return;
    }

    setNotice({ open: true, severity: "success", message: "Email sent successfully." });
    setForm(emptyForm);
    setAttachments([]);
    window.setTimeout(() => onClose?.(), 500);
  };

  if (!open) {
    return <AppSnackbar open={notice.open} message={notice.message} severity={notice.severity} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} autoHideDuration={5000} />;
  }

  return (
    <>
      <div className="fixed inset-0 z-[1200] flex h-[100dvh] w-screen flex-col overflow-hidden rounded-none border-0 bg-background text-foreground" role="dialog" aria-modal="true" aria-labelledby="compose-email-title">
        <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-2 pb-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] sm:px-2 sm:pb-4">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary sm:flex">
              <Mail className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2 id="compose-email-title" className="text-lg font-bold tracking-tight sm:text-xl">Compose email</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">Send a message to a Maa Mara Market user.</p>
            </div>
          </div>
          <button type="button" onClick={onClose} disabled={loading} aria-label="Close compose email" title="Close email composer" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[20px] border-2 border-foreground/20 bg-muted text-foreground shadow-sm transition hover:border-destructive/50 hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50">
            <X className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
          </button>
        </header>

        <form onSubmit={handleSend} className="flex min-h-0 flex-1 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-5 sm:px-2 sm:py-6">
            <div className="mx-auto w-full max-w-4xl space-y-5">
              <section className="rounded-[20px] border border-border bg-card p-2 shadow-sm sm:p-2">
                <div className="mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" aria-hidden="true" />
                  <h3 className="text-sm font-semibold">Choose a contact</h3>
                </div>
                <div className="flex max-h-36 flex-wrap gap-2 overflow-y-auto">
                  {users.map((entry) => {
                    const selected = form.to === entry.email;
                    return (
                      <button key={entry.id ?? entry.email} type="button" onClick={() => setForm((previous) => ({ ...previous, to: entry.email || "" }))} disabled={!entry.email || loading} aria-pressed={selected}
                        className={`max-w-full rounded-[20px] border px-3.5 py-2 text-left text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50 ${selected ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-background text-foreground hover:border-primary/50 hover:bg-muted"}`}>
                        <span className="block truncate">{entry.username || entry.email}</span>
                      </button>
                    );
                  })}
                  {!users.length && <p className="text-sm text-muted-foreground">Contact list is unavailable; you can enter an email address manually.</p>}
                </div>
              </section>

              <section className="space-y-4 rounded-[20px] border border-border bg-card p-2 shadow-sm sm:p-2">
                <div>
                  <label htmlFor="compose-to" className="text-sm font-semibold">To <span className="text-destructive">*</span></label>
                  <input id="compose-to" name="to" type="email" autoComplete="email" value={form.to} onChange={updateField("to")} required disabled={loading} placeholder="recipient@example.com" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="compose-subject" className="text-sm font-semibold">Subject <span className="text-destructive">*</span></label>
                  <input id="compose-subject" name="subject" value={form.subject} onChange={updateField("subject")} required disabled={loading} placeholder="Add an email subject" className={fieldClass} />
                </div>
                <div>
                  <label htmlFor="compose-message" className="text-sm font-semibold">Message <span className="text-destructive">*</span></label>
                  <textarea id="compose-message" name="message" value={form.message} onChange={updateField("message")} required disabled={loading} rows={8} placeholder="Write your message…" className={`${fieldClass} min-h-48 resize-y leading-6`} />
                </div>
              </section>

              <section className="rounded-[20px] border border-dashed border-border bg-card/70 p-2 sm:p-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-semibold">Attachments</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Attach files to include them with this email.</p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-[20px]" disabled={loading} asChild>
                    <label className="cursor-pointer">
                      <Paperclip className="h-4 w-4" aria-hidden="true" />
                      Attach files
                      <input type="file" multiple onChange={handleFiles} className="sr-only" />
                    </label>
                  </Button>
                </div>
                {attachments.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {attachments.map((file, index) => (
                      <li key={file.name + file.size + index} className="flex min-w-0 items-center justify-between gap-3 rounded-[20px] border border-border bg-background px-2 py-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <Paperclip className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                          <span className="truncate text-sm" title={file.name}>{file.name}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                        </div>
                        <button type="button" aria-label={`Remove ${file.name}`} disabled={loading} onClick={() => setAttachments((previous) => previous.filter((_, fileIndex) => fileIndex !== index))} className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[16px] text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
          </div>

          <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-2 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] sm:px-2 sm:py-4">
            <p className="hidden text-xs text-muted-foreground sm:block">Required fields are marked with *.</p>
            <div className="ml-auto flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
              <Button type="button" variant="outline" className="w-full rounded-[20px] sm:w-auto" onClick={onClose} disabled={loading}>Cancel</Button>
              <Button type="submit" className="w-full rounded-[20px] sm:w-auto" disabled={loading}>
                {loading ? <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
                {loading ? "Sending…" : "Send email"}
              </Button>
            </div>
          </footer>
        </form>
      </div>
      <AppSnackbar open={notice.open} message={notice.message} severity={notice.severity} onClose={() => setNotice((previous) => ({ ...previous, open: false }))} autoHideDuration={5000} />
    </>
  );
};

export default ComposeEmail;
