import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { helpCircleOutline, sendOutline, refreshOutline, closeOutline } from "ionicons/icons";
import api from "../../../../Services/Api";

const statusClasses = {
  answered: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-300",
};

const SupportAdminPanel = ({ open, onClose }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const fetchTickets = async () => {
    try {
      setError("");
      setLoading(true);
      const response = await api.get("/api/support/inbox/", { withCredentials: true });
      const data = Array.isArray(response.data) ? response.data : [];
      setTickets(data);
      setSelectedTicket((current) => current ? data.find((ticket) => ticket.id === current.id) || current : null);
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Could not load support requests.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const selectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReply(ticket.support_reply || "");
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;

    try {
      setSending(true);
      setError("");
      const response = await api.post(
        `/api/support/reply/${selectedTicket.id}/`,
        { support_reply: reply.trim() },
        { withCredentials: true }
      );
      const updated = response.data;
      setTickets((current) => current.map((ticket) => ticket.id === updated.id ? updated : ticket));
      setSelectedTicket(updated);
      setReply(updated.support_reply || "");
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "Could not send the reply.");
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="min-h-[calc(100vh-72px)] w-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="relative mx-auto max-w-7xl rounded-2xl border border-border bg-background p-2 shadow-2xl sm:p-4">
        <button type="button" onClick={onClose} aria-label="Close support" className="absolute right-3 top-3 z-10 rounded-xl p-2 text-muted-foreground hover:bg-muted">
          <IonIcon icon={closeOutline} />
        </button>
        <header className="mb-5 rounded-2xl border border-border bg-card p-5 pr-14 shadow-sm sm:p-6 sm:pr-14">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Customer care</p>
              <h1 className="mt-1 text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">Support inbox</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                Review customer questions, see the issue category, and reply directly to the email they provided.
              </p>
            </div>
            <button
              type="button"
              onClick={fetchTickets}
              disabled={loading}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-card-foreground hover:bg-muted disabled:opacity-50"
            >
              <IonIcon icon={refreshOutline} />
              Refresh
            </button>
          </div>
        </header>

        {error && (
          <div role="alert" className="mb-5 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        <section className="grid min-h-[520px] overflow-hidden rounded-2xl border border-border bg-card shadow-custom md:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="min-h-0 border-b border-border md:border-b-0 md:border-r">
            <div className="border-b border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <IonIcon icon={helpCircleOutline} className="text-lg text-card-foreground" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-card-foreground">Requests</p>
                  <p className="text-xs text-muted-foreground">{tickets.length} total</p>
                </div>
              </div>
            </div>

            <div className="max-h-[560px] overflow-y-auto">
              {loading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading support requests...</div>
              ) : tickets.length ? (
                tickets.map((ticket) => (
                  <button
                    key={ticket.id}
                    type="button"
                    onClick={() => selectTicket(ticket)}
                    className={`block w-full border-b border-border p-4 text-left transition hover:bg-muted/60 ${selectedTicket?.id === ticket.id ? "bg-muted" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 flex-1 truncate text-sm font-semibold text-card-foreground">
                        {ticket.subject}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-semibold uppercase ${statusClasses[ticket.status] || "bg-muted text-muted-foreground"}`}>
                        {ticket.status || "pending"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{ticket.email}</p>
                    <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted-foreground">{ticket.message}</p>
                  </button>
                ))
              ) : (
                <div className="p-6 text-sm text-muted-foreground">No support requests yet.</div>
              )}
            </div>
          </aside>

          <main className="min-w-0 p-5 sm:p-6 lg:p-8">
            {!selectedTicket ? (
              <div className="grid min-h-[420px] place-items-center text-center">
                <div className="max-w-sm">
                  <IonIcon icon={helpCircleOutline} className="text-4xl text-muted-foreground" />
                  <p className="mt-3 text-base font-semibold text-card-foreground">Select a support request</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Customer questions will appear here after they submit the support form.
                  </p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {selectedTicket.category || "Other"}
                    </p>
                    <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-card-foreground sm:text-2xl">
                      {selectedTicket.subject}
                    </h2>
                    <p className="mt-1 break-all text-sm text-muted-foreground">{selectedTicket.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${statusClasses[selectedTicket.status] || "bg-muted text-muted-foreground"}`}>
                    {selectedTicket.status || "pending"}
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-border bg-muted/40 p-4 sm:p-5">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Customer message</p>
                  <p className="whitespace-pre-wrap break-words text-sm leading-6 text-card-foreground">
                    {selectedTicket.message}
                  </p>
                </div>

                <div className="mt-6">
                  <label htmlFor="support-reply" className="text-sm font-semibold text-card-foreground">Reply</label>
                  <textarea
                    id="support-reply"
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={7}
                    className="mt-2 w-full resize-y rounded-2xl border border-border bg-transparent p-4 text-sm leading-6 text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
                    placeholder="Write a response to the customer..."
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IonIcon icon={sendOutline} />
                    {sending ? "Sending..." : "Send reply"}
                  </button>
                </div>
              </div>
            )}
          </main>
        </section>
      </div>
    </div>
  );
};

export default SupportAdminPanel;
