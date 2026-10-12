import { Activity, Clock3, Trash2 } from "lucide-react";
import { useState } from "react";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useVendorActivityLogs } from "../../Hooks/ActivityHook/ActivityHook";

dayjs.extend(relativeTime);

const VendorActivitiesPage = () => {
  const {
    activityLogs = [],
    loading,
    error,
    deleteActivity,
    clearAllActivities,
  } = useVendorActivityLogs({ all: true });
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

  return (
    <section className="min-w-0 space-y-5 text-[#222] sm:space-y-6">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#f8f8f6] text-[#222]">
            <Activity className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#595959]">
              Store history
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222] sm:text-3xl">
              All Activities
            </h1>
            <p className="mt-1.5 max-w-2xl text-sm leading-6 text-[#595959]">
              See actions performed by your vendor account, including item requests and product updates.
            </p>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-[#6b7280]">You can remove individual records or clear your activity history.</p>
          {activityLogs.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllActivities}
              className="inline-flex items-center gap-2 rounded-full border border-red-200 px-4 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Clear all activities
            </button>
          )}
        </div>
      </header>

      {actionError && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </p>
      )}

      <div className="rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-[#e6e6e4] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-base font-semibold text-[#222] sm:text-lg">Activity history</h2>
            <p className="mt-0.5 text-xs text-[#595959]">
              {activityLogs.length} recorded {activityLogs.length === 1 ? "activity" : "activities"}
            </p>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          {loading ? (
            <div className="rounded-2xl border border-[#e6e6e4] bg-[#f8f8f6] p-6 text-center text-sm text-[#595959]">
              Loading your activity history...
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center text-sm text-red-700">
              We couldn&apos;t load your activity history. Please try again.
            </div>
          ) : activityLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-[#d9d9d6] bg-[#f8f8f6] p-8 text-center">
              <Activity className="mx-auto h-7 w-7 text-[#595959]" />
              <p className="mt-3 text-sm font-semibold text-[#222]">No activities yet</p>
              <p className="mt-1 text-xs leading-5 text-[#595959]">
                Activity will appear here when something happens on your vendor account.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#eeeeeb] overflow-hidden rounded-2xl border border-[#e6e6e4]">
              {activityLogs.map((log) => (
                <article key={log.id} className="bg-white p-4 transition hover:bg-[#fafaf8] sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-[#9ca3af]" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <h3 className="text-sm font-semibold text-[#222] sm:text-[15px]">
                            {log.display_title || log.action || "Store activity"}
                          </h3>
                          <p className="mt-1 text-sm leading-6 text-[#374151]">
                            {log.display_message || log.description || "An activity was recorded on your account."}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-[#6b7280]">
                          <div className="flex items-center gap-1.5">
                            <Clock3 className="h-3.5 w-3.5" />
                            <span title={log.timestamp ? new Date(log.timestamp).toLocaleString() : undefined}>
                              {log.timestamp ? dayjs(log.timestamp).fromNow() : "Recently"}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteActivity(log.id)}
                            aria-label="Delete activity"
                            title="Delete activity"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default VendorActivitiesPage;
