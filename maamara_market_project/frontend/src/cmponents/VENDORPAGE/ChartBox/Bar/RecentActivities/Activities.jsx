import dayjs from "dayjs";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import relativeTime from "dayjs/plugin/relativeTime";
import { Link } from "react-router-dom";
import { useVendorActivityLogs } from "../../../../../cmponents/Hooks/ActivityHook/ActivityHook";
import SafeActivityContent, { getSafeActivityText } from "../../../SellerDasboard/SafeActivityContent";

dayjs.extend(relativeTime);

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = String(text).trim().split(/\s+/);
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : String(text);
};

const Activities = () => {
  const {
    activityLogs = [],
    loading,
    error,
    deleteActivity,
    clearAllActivities,
  } = useVendorActivityLogs();
  const [actionError, setActionError] = useState("");

  const handleDeleteActivity = async (activityId) => {
    if (!window.confirm("Delete this activity? This cannot be undone.")) return;
    try {
      setActionError("");
      await deleteActivity(activityId);
    } catch (deleteError) {
      setActionError("We couldn't delete that activity. Please try again.");
    }
  };

  const handleClearAllActivities = async () => {
    if (!window.confirm("Clear all of your vendor activities? This cannot be undone.")) return;
    try {
      setActionError("");
      await clearAllActivities();
    } catch (clearError) {
      setActionError("We couldn't clear your activities. Please try again.");
    }
  };

  if (loading) {
    return (
      <section className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#e6e6e4] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
            <p className="mt-1 text-xs text-[#595959]">A record of actions taken by your vendor account.</p>
          </div>
          <Link to="/vendors-dashboard/activities" className="shrink-0 rounded-full border border-[#d9d9d6] bg-white px-3.5 py-2 text-xs font-semibold text-[#222] transition hover:bg-[#f8f8f6] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20">
            View All
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-[#e6e6e4] bg-[#f8f8f6] p-4 text-sm text-[#595959]">Loading recent activities...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-w-0">
        <div className="flex items-center justify-between gap-3 border-b border-[#e6e6e4] pb-3">
          <div>
            <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
            <p className="mt-1 text-xs text-[#595959]">A record of actions taken by your vendor account.</p>
          </div>
          <Link to="/vendors-dashboard/activities" className="shrink-0 rounded-full border border-[#d9d9d6] bg-white px-3.5 py-2 text-xs font-semibold text-[#222] transition hover:bg-[#f8f8f6] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20">
            View All
          </Link>
        </div>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">We couldn&apos;t load your recent activities.</div>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="flex flex-col gap-3 border-b border-[#e6e6e4] pb-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
          <p className="mt-1 text-xs leading-5 text-[#595959]">A record of actions taken by your vendor account.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {activityLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllActivities}
              className="inline-flex items-center gap-1.5 rounded-full border border-red-200 px-3 py-2 text-[11px] font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all
            </button>
          )}
          <Link to="/vendors-dashboard/activities" className="shrink-0 rounded-full border border-[#d9d9d6] bg-white px-3.5 py-2 text-xs font-semibold text-[#222] transition hover:bg-[#f8f8f6] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20">
            View All
          </Link>
        </div>
      </div>
      {actionError && <p role="alert" className="mt-3 text-xs text-red-700">{actionError}</p>}

      <div className="mt-4 max-h-[320px] overflow-y-auto pr-1">
        {activityLogs.length === 0 ? (
          <div className="rounded-2xl border border-[#e6e6e4] bg-[#f8f8f6] p-5 text-center text-sm text-[#374151]">No vendor activity yet.</div>
        ) : (
          <ul className="divide-y divide-[#eeeeeb] rounded-2xl border border-[#e6e6e4] bg-white">
            {activityLogs.map((log) => (
              <li key={log.id || log.timestamp} className="p-4">
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#9ca3af]" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[#595959]">{log.display_title || "Store activity"}</p>
                    <SafeActivityContent content={truncateWords(getSafeActivityText(log.display_message || log.description), 16)} className="mt-1 text-sm leading-6 text-[#222] break-words" />
                    <p className="mt-1 text-xs text-[#6b7280]">{log.timestamp ? dayjs(log.timestamp).fromNow() : "Recently"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteActivity(log.id)}
                    aria-label="Delete activity"
                    title="Delete activity"
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
};

export default Activities;
