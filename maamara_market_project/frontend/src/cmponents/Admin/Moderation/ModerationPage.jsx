import { useCallback, useEffect, useState } from "react";
import api from "../../../Services/Api";

const TABS = [
  { key: "open", label: "Open" },
  { key: "actioned", label: "Action taken" },
  { key: "dismissed", label: "Dismissed" },
];

const when = (value) => (value ? new Date(value).toLocaleString() : "");

function ReportCard({ report, onResolve, busyId }) {
  const [note, setNote] = useState("");
  const open = report.status === "open";
  const act = (action) => onResolve(report, action, note);
  const busy = busyId === report.id;
  const canRemove = report.target_type !== "user";

  return (
    <article className={`rounded-2xl border bg-card p-4 shadow-sm ${report.overdue ? "border-red-400" : "border-border"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold">{report.target_type_label} #{report.target_id}</span>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">{report.reason_label}</span>
          {report.other_reports_on_target > 0 && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-800">+{report.other_reports_on_target} more report{report.other_reports_on_target > 1 ? "s" : ""}</span>
          )}
          {report.overdue && <span className="rounded-full bg-red-600 px-2 py-0.5 text-xs font-semibold text-white">Overdue (24h)</span>}
        </div>
        <span className="text-xs text-muted-foreground">{when(report.created_at)}</span>
      </div>

      <p className="mt-3 whitespace-pre-wrap break-words rounded-xl bg-muted/60 p-3 text-sm">{report.snapshot || "(content no longer available)"}</p>
      {report.details && <p className="mt-2 text-sm"><span className="font-semibold">Reporter says: </span>{report.details}</p>}
      <p className="mt-2 text-xs text-muted-foreground">
        Reported by {report.reporter} · Author: {report.owner || "unknown"}{report.owner && !report.owner_active ? " (suspended)" : ""}
      </p>

      {open ? (
        <div className="mt-3 space-y-2">
          <textarea
            rows={2}
            maxLength={1000}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="Moderator note (kept on record)"
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-border"
          />
          <div className="flex flex-wrap gap-2">
            <button type="button" disabled={busy} onClick={() => act("dismiss")} className="rounded-full border border-border px-4 py-2 text-xs font-semibold disabled:opacity-50">Dismiss</button>
            {canRemove && <button type="button" disabled={busy} onClick={() => act("remove")} className="rounded-full bg-amber-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Remove content</button>}
            {report.owner_id && <button type="button" disabled={busy} onClick={() => window.confirm(`Suspend ${report.owner}? They will be signed out and unable to log in.`) && act("suspend")} className="rounded-full bg-red-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Suspend user</button>}
            {canRemove && report.owner_id && <button type="button" disabled={busy} onClick={() => window.confirm(`Remove this content and suspend ${report.owner}?`) && act("remove_suspend")} className="rounded-full bg-red-800 px-4 py-2 text-xs font-semibold text-white disabled:opacity-50">Remove + suspend</button>}
          </div>
        </div>
      ) : (
        <div className="mt-3 space-y-2 text-xs text-muted-foreground">
          <p>{report.action_label} by {report.resolved_by || "—"} on {when(report.resolved_at)}{report.moderator_note ? ` — “${report.moderator_note}”` : ""}</p>
          <button type="button" disabled={busy} onClick={() => window.confirm("Undo this decision? Content returns and any suspension is lifted.") && onResolve(report, "restore", "Restored by moderator")} className="rounded-full border border-border px-3 py-1.5 font-semibold text-card-foreground disabled:opacity-50">Undo decision</button>
        </div>
      )}
    </article>
  );
}

/** Admin queue for reported content. Reports must be reviewed within 24 hours. */
export default function ModerationPage() {
  const [tab, setTab] = useState("open");
  const [data, setData] = useState({ results: [], open_count: 0, overdue_count: 0, sla_hours: 24 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get("/api/admin/moderation/reports/", { params: { status: tab } });
      setData(response.data);
    } catch {
      setError("Could not load reports.");
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (report, action, note) => {
    setBusyId(report.id);
    setError("");
    try {
      await api.post(`/api/admin/moderation/reports/${report.id}/resolve/`, { action, note });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.detail || "That action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4">
      <header>
        <h1 className="text-xl font-bold text-card-foreground">Moderation</h1>
        <p className="text-sm text-muted-foreground">
          Reported reviews, comments, blog posts, messages and listings. Review every report within {data.sla_hours} hours.
        </p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold">
          <span className="rounded-full bg-muted px-3 py-1">{data.open_count} open</span>
          <span className={`rounded-full px-3 py-1 ${data.overdue_count ? "bg-red-600 text-white" : "bg-muted"}`}>{data.overdue_count} overdue</span>
        </div>
      </header>

      <nav className="flex gap-2" aria-label="Report status">
        {TABS.map((item) => (
          <button key={item.key} type="button" onClick={() => setTab(item.key)} aria-pressed={tab === item.key}
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${tab === item.key ? "bg-black text-white" : "border border-border"}`}>{item.label}</button>
        ))}
      </nav>

      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : data.results.length === 0 ? (
        <p className="text-sm text-muted-foreground">No reports here.</p>
      ) : (
        <div className="space-y-3">
          {data.results.map((report) => <ReportCard key={report.id} report={report} onResolve={resolve} busyId={busyId} />)}
        </div>
      )}
    </div>
  );
}
