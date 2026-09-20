import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline, sendOutline, helpCircleOutline } from "ionicons/icons";
import api from "../../../../Services/Api";

const statusClasses = {
  answered: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
};

const SupportAdminPanel = ({ open, onClose }) => {
  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/support/inbox/");
      setTickets(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error("Support inbox load failed:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchTickets();
  }, [open]);

  const selectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setReply(ticket.support_reply || "");
  };

  const sendReply = async () => {
    if (!selectedTicket || !reply.trim()) return;

    try {
      setSending(true);
      await api.post(`/api/support/reply/${selectedTicket.id}/`, {
        support_reply: reply.trim(),
      });
      await fetchTickets();
      setSelectedTicket((current) => current ? {
        ...current,
        support_reply: reply.trim(),
        status: "answered",
      } : current);
    } catch (error) {
      console.error("Support reply failed:", error);
    } finally {
      setSending(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[80] flex justify-end bg-slate-950/55" onMouseDown={onClose}>
      <section
        className="flex h-full w-full max-w-5xl flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-slate-200 px-4 sm:px-6 dark:border-slate-800">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-300">Admin inbox</p>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Support administration</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 md:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="min-h-0 overflow-y-auto border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900 md:border-b-0 md:border-r">
            <div className="border-b border-slate-200 p-4 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <IonIcon icon={helpCircleOutline} className="text-lg text-indigo-600" />
                <p className="font-semibold text-slate-900 dark:text-white">Support inbox</p>
              </div>
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{tickets.length} tickets</p>
            </div>

            {loading ? (
              <div className="p-5 text-sm text-slate-400">Loading tickets…</div>
            ) : tickets.length ? (
              tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  type="button"
                  onClick={() => selectTicket(ticket)}
                  className={`block w-full border-b border-slate-200 p-4 text-left dark:border-slate-800 ${selectedTicket?.id === ticket.id ? "bg-indigo-50 dark:bg-indigo-500/10" : "hover:bg-white dark:hover:bg-slate-800"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">{ticket.name}</p>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusClasses[ticket.status] || "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300"}`}>
                      {ticket.status || "pending"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{ticket.message_id || `#${ticket.id}`}</p>
                  <p className="mt-2 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{ticket.message}</p>
                </button>
              ))
            ) : (
              <div className="p-5 text-sm text-slate-400">No support tickets found.</div>
            )}
          </aside>

          <main className="min-h-0 overflow-y-auto p-4 sm:p-6 lg:p-8">
            {!selectedTicket ? (
              <div className="grid min-h-full place-items-center text-center">
                <div>
                  <IonIcon icon={helpCircleOutline} className="text-4xl text-slate-300" />
                  <p className="mt-3 font-semibold text-slate-700 dark:text-slate-200">Select a support ticket</p>
                  <p className="mt-1 text-sm text-slate-400">Choose a message from the inbox to view and reply.</p>
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-white">{selectedTicket.name}</h3>
                    <p className="mt-1 text-sm text-slate-500">{selectedTicket.email}</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${statusClasses[selectedTicket.status] || "bg-slate-100 text-slate-600"}`}>
                    {selectedTicket.status || "pending"}
                  </span>
                </div>

                <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Customer message</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700 dark:text-slate-200">{selectedTicket.message}</p>
                </div>

                <div className="mt-6">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-400">Reply</label>
                  <textarea
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    rows={7}
                    className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-transparent p-4 text-sm text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/15 dark:border-slate-700 dark:text-white"
                    placeholder="Write a response to the customer…"
                  />
                  <button
                    type="button"
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <IonIcon icon={sendOutline} />
                    {sending ? "Sending…" : "Send reply"}
                  </button>
                </div>
              </div>
            )}
          </main>
        </div>
      </section>
    </div>
  );
};

export default SupportAdminPanel;
