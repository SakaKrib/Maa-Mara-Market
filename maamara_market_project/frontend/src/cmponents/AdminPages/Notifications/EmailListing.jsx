import { useEffect, useState } from "react";
import { Drawer, Tabs, Tab, Divider, IconButton, CircularProgress } from "@mui/material";
import { Close, Mail, Send, AlertCircle, Inbox, PenLine } from "lucide-react";
import api from "../../../Services/Api";
import { Button } from "../../../../components/ui/button";
import ComposeEmail from "./AdminComposeEmail";

const EmailPanel = ({ open, onClose, filter = "sent" }) => {
  const [tab, setTab] = useState(filter);
  const [emails, setEmails] = useState([]);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ sent: 0, failed: 0, all: 0 });
  const [openCompose, setOpenCompose] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => { if (open) setTab(filter || "sent"); }, [open, filter]);

  useEffect(() => {
    if (!open) return undefined;
    let active = true;
    const fetchData = async (showLoader = false) => {
      if (showLoader) setLoading(true);
      setLoadError("");
      try {
        const [emailRes, statsRes, usersRes] = await Promise.all([
          api.get(`/api/email/list/?status=${tab}`),
          api.get("/api/email/stats/"),
          api.get("/api/email-users/"),
        ]);
        if (!active) return;
        setEmails(Array.isArray(emailRes.data) ? emailRes.data : (emailRes.data?.results || []));
        setStats(statsRes.data || { sent: 0, failed: 0, all: 0 });
        setUsers(Array.isArray(usersRes.data) ? usersRes.data : (usersRes.data?.results || []));
      } catch (error) {
        if (active) setLoadError(error?.response?.data?.detail || error?.response?.data?.error || "We couldn't load email activity. Please try again.");
      } finally {
        if (active && showLoader) setLoading(false);
      }
    };
    fetchData(true);
    const interval = window.setInterval(() => fetchData(false), 15000);
    return () => { active = false; window.clearInterval(interval); };
  }, [tab, open]);

  const openComposer = (user = null) => { setSelectedUser(user); setOpenCompose(true); };
  const closeComposer = () => { setOpenCompose(false); setSelectedUser(null); };
  const formatDate = (value) => {
    if (!value) return "";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
  };

  const statCards = [
    { label: "Sent", value: stats.sent ?? 0, icon: Send, key: "sent", detail: "Successfully sent" },
    { label: "Failed", value: stats.failed ?? 0, icon: AlertCircle, key: "failed", detail: "Needs attention" },
    { label: "All emails", value: stats.all ?? 0, icon: Inbox, key: "all", detail: "Total email activity" },
  ];

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: {
      width: { xs: "100%", sm: "min(100%, 1080px)" }, maxWidth: "100vw",
      bgcolor: "background.default", color: "text.primary", overflow: "hidden",
    } }}>
      <div className="flex h-full min-h-0 flex-col bg-background text-foreground">
        <header className="flex items-start justify-between gap-4 border-b border-border bg-card px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Mail size={22} /></div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">Admin workspace</p>
              <h2 className="mt-1 text-xl font-bold tracking-tight text-card-foreground sm:text-2xl">Email center</h2>
              <p className="mt-1 text-sm text-muted-foreground">Review delivery status and contact users from one place.</p>
            </div>
          </div>
          <IconButton aria-label="Close email center" onClick={onClose} size="small" sx={{ color: "text.secondary" }}><Close size={20} /></IconButton>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b border-border bg-card lg:border-b-0 lg:border-r">
            <div className="flex items-center justify-between gap-2 px-4 pb-3 pt-4 sm:px-5">
              <div><h3 className="text-sm font-bold text-card-foreground">Contacts</h3><p className="mt-0.5 text-xs text-muted-foreground">Choose a recipient to compose</p></div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">{users.length}</span>
            </div>
            <Divider sx={{ borderColor: "divider" }} />
            <div className="max-h-44 overflow-y-auto p-2 sm:max-h-52 lg:max-h-[calc(100%-68px)]">
              {users.length === 0 ? <p className="px-3 py-5 text-sm text-muted-foreground">No contacts available.</p> : users.map((user) => (
                <button key={user.id} type="button" onClick={() => openComposer(user)} className="flex w-full min-w-0 items-center gap-3 rounded-xl p-3 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{(user.username || user.email || "?").slice(0, 1).toUpperCase()}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-card-foreground">{user.username || "User"}</span><span className="mt-0.5 block break-all text-xs text-muted-foreground">{user.email || "No email address"}</span></span>
                  <PenLine size={15} className="shrink-0 text-muted-foreground" />
                </button>
              ))}
            </div>
          </aside>

          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div><h3 className="text-lg font-bold text-card-foreground">Email activity</h3><p className="mt-1 text-sm text-muted-foreground">Track delivery and open a message to review its details.</p></div>
              <Button onClick={() => openComposer()} className="inline-flex items-center gap-2 self-start"><PenLine size={16} /> Compose email</Button>
            </div>

            <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {statCards.map(({ label, value, icon: Icon, key, detail }) => (
                <button key={key} type="button" onClick={() => { setTab(key); setSelectedEmail(null); }} className={`rounded-2xl border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-primary/30 ${tab === key ? "border-primary/40 bg-primary/5" : "border-border bg-card hover:bg-muted/50"}`}>
                  <div className="flex items-center justify-between gap-3"><span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</span><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-muted text-primary"><Icon size={18} /></span></div>
                  <p className="mt-2 text-2xl font-bold tracking-tight text-card-foreground">{Number(value || 0).toLocaleString()}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p>
                </button>
              ))}
            </div>

            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <Tabs value={tab} onChange={(_, value) => { setTab(value); setSelectedEmail(null); }} aria-label="Email status filter" sx={{
                minHeight: 40, "& .MuiTab-root": { minHeight: 40, minWidth: 72, px: 2, textTransform: "none", fontWeight: 600, fontSize: 13, color: "text.secondary" },
                "& .Mui-selected": { color: "primary.main" }, "& .MuiTabs-indicator": { height: 2, borderRadius: 2 },
              }}>
                <Tab label="Sent" value="sent" /><Tab label="Failed" value="failed" /><Tab label="All" value="all" />
              </Tabs>
              <span className="text-xs text-muted-foreground">{emails.length} {emails.length === 1 ? "message" : "messages"}</span>
            </div>

            {loadError && <div role="alert" className="mb-4 rounded-xl border border-red-500/25 bg-red-500/5 p-3 text-sm text-red-600 dark:text-red-300">{loadError}</div>}
            <div className="min-h-40 overflow-hidden rounded-2xl border border-border bg-card">
              {loading ? <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-muted-foreground"><CircularProgress size={20} /> Loading email activity…</div> :
                emails.length === 0 ? <div className="flex min-h-48 flex-col items-center justify-center px-5 py-10 text-center"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"><Mail size={22} /></span><p className="mt-3 text-sm font-semibold text-card-foreground">No emails in this view</p><p className="mt-1 max-w-sm text-xs text-muted-foreground">Messages will appear here when there is email activity for this status.</p></div> :
                <div className="divide-y divide-border">{emails.map((email) => {
                  const selected = selectedEmail?.id === email.id;
                  const status = String(email.status || tab).toLowerCase();
                  return <button key={email.id} type="button" onClick={() => setSelectedEmail(selected ? null : email)} className={`block w-full px-4 py-4 text-left transition sm:px-5 ${selected ? "bg-primary/5" : "hover:bg-muted/40"}`}>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><p className="truncate text-sm font-semibold text-card-foreground">{email.subject || "(No subject)"}</p><p className="mt-1 break-all text-xs text-muted-foreground">To: {email.recipient || email.to || "Unknown recipient"}</p></div><span className={`inline-flex w-fit shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${status === "failed" ? "bg-red-500/10 text-red-600 dark:text-red-300" : "bg-primary/10 text-primary"}`}>{status}</span></div>
                    {email.created_at || email.sent_at ? <p className="mt-2 text-[11px] text-muted-foreground">{formatDate(email.sent_at || email.created_at)}</p> : null}
                    {selected && <div className="mt-4 rounded-xl border border-border bg-background p-4"><div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-muted-foreground"><span><strong className="text-card-foreground">To:</strong> {email.recipient || email.to || "—"}</span>{email.created_at || email.sent_at ? <span><strong className="text-card-foreground">Date:</strong> {formatDate(email.sent_at || email.created_at)}</span> : null}</div><p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{email.message || email.body || "No message body is available for this email record."}</p></div>}
                  </button>;
                })}</div>}
            </div>
          </main>
        </div>
        <ComposeEmail open={openCompose} onClose={closeComposer} user={selectedUser} />
      </div>
    </Drawer>
  );
};

export default EmailPanel;
