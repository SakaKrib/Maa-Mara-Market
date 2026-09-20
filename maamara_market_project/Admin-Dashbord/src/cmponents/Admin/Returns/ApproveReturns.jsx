import React, { useState } from "react";
import { usePendingReturns } from "../../Hooks/ReturnHook/ReturnHook";
import api from "../../../Services/Api";

const PendingReturnsList = () => {
  const { returns, isLoading, error, refetch } = usePendingReturns();
  const [loadingId, setLoadingId] = useState(null);
  const [message, setMessage] = useState("");
  const [actionError, setActionError] = useState("");

  const handleAction = async (id, action) => {
    setLoadingId(id);
    setMessage("");
    setActionError("");

    try {
      const response = await api.post(
        `/api/returns/${id}/approve/`,
        {
          action,
          admin_note: action === "approve"
            ? "Return approved successfully."
            : "Return rejected.",
        },
        { withCredentials: true }
      );
      setMessage(response.data?.message || "Action completed successfully.");
      await refetch(true);
    } catch (err) {
      console.error("Return action failed:", err);
      setActionError(err?.response?.data?.error || "Something went wrong.");
    } finally {
      setLoadingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-3">
        {[1, 2, 3, 4].map((item) => (
          <div key={item} className="animate-pulse rounded-2xl border border-border bg-card p-5">
            <div className="h-4 w-2/5 rounded bg-muted" />
            <div className="mt-3 h-3 w-3/5 rounded bg-muted" />
            <div className="mt-2 h-3 w-4/5 rounded bg-muted" />
            <div className="mt-5 h-9 w-full rounded-xl bg-muted sm:w-48" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    const detail = typeof error === "string" ? error : error?.error || "Unable to load pending returns.";
    return <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-700 dark:text-red-300">{detail}</div>;
  }

  if (!returns.length) {
    return <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No pending return requests at the moment.</div>;
  }

  return (
    <div className="grid gap-3">
      {message && <div className="rounded-xl border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-300">{message}</div>}
      {actionError && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">{actionError}</div>}

      {returns.map((ret) => {
        const busy = loadingId === ret.id;
        return (
          <article key={ret.id} className="rounded-2xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="break-words text-sm font-bold text-card-foreground sm:text-base">
                  {ret.item_name || `Item #${ret.item}`}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  Requested {ret.created_at ? new Date(ret.created_at).toLocaleString() : "—"}
                </p>
              </div>
              <span className="rounded-full bg-yellow-500/10 px-3 py-1 text-xs font-bold capitalize text-yellow-700 dark:text-yellow-400">
                {ret.status || "pending"}
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Preference</p>
                <p className="mt-1 text-sm font-semibold capitalize text-card-foreground">{ret.customer_preference || "—"}</p>
              </div>
              <div className="rounded-xl bg-muted/50 p-3">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Order Item</p>
                <p className="mt-1 text-sm font-semibold text-card-foreground">#{ret.item ?? "—"}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={busy} onClick={() => handleAction(ret.id, "approve")} className="rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? "Processing..." : "Approve"}
              </button>
              <button type="button" disabled={busy} onClick={() => handleAction(ret.id, "reject")} className="rounded-xl border border-red-500/40 bg-card px-4 py-2.5 text-sm font-semibold text-red-600 dark:text-red-400 disabled:cursor-not-allowed disabled:opacity-50">
                {busy ? "Processing..." : "Reject"}
              </button>
            </div>
          </article>
        );
      })}
    </div>
  );
};

export default PendingReturnsList;
