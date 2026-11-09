import { useCallback, useEffect, useState } from "react";
import api from "../../Services/Api";

/** Lists users the signed-in person has blocked, with an Unblock button. */
export default function BlockedUsersSection() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const { data } = await api.get("/api/moderation/blocks/");
      setRows(Array.isArray(data) ? data : []);
    } catch {
      setError("We could not load your blocked users.");
      setRows([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const unblock = async (userId) => {
    try {
      await api.delete(`/api/moderation/blocks/${userId}/`);
      setRows((current) => (current || []).filter((row) => row.user_id !== userId));
    } catch {
      setError("We could not unblock this user. Please try again.");
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 sm:p-5" aria-label="Blocked users">
      <h3 className="text-base font-bold text-card-foreground">Blocked users</h3>
      <p className="mt-1 text-xs text-muted-foreground">You will not see reviews, comments or blog posts from people you block.</p>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
      {rows === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">You have not blocked anyone.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border">
          {rows.map((row) => (
            <li key={row.user_id} className="flex items-center justify-between gap-3 py-2">
              <span className="truncate text-sm text-card-foreground">{row.username}</span>
              <button type="button" onClick={() => unblock(row.user_id)} className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-card-foreground hover:bg-muted">Unblock</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
