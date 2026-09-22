import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useVendorActivityLogs } from "../../../../../cmponents/Hooks/ActivityHook/ActivityHook";

dayjs.extend(relativeTime);

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = String(text).trim().split(/\s+/);
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : String(text);
};

const Activities = () => {
  const { activityLogs = [], loading, error } = useVendorActivityLogs();

  if (loading) {
    return (
      <section className="min-w-0">
        <div className="border-b border-[#e6e6e4] pb-3">
          <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
          <p className="mt-1 text-xs text-[#595959]">A simple record of what has been happening in your store.</p>
        </div>
        <div className="mt-4 rounded-2xl border border-[#e6e6e4] bg-[#f8f8f6] p-4 text-sm text-[#595959]">Loading recent activities...</div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="min-w-0">
        <div className="border-b border-[#e6e6e4] pb-3">
          <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
          <p className="mt-1 text-xs text-[#595959]">A simple record of what has been happening in your store.</p>
        </div>
        <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">We couldn&apos;t load your recent activities.</div>
      </section>
    );
  }

  return (
    <section className="min-w-0">
      <div className="border-b border-[#e6e6e4] pb-3">
        <h2 className="text-base font-semibold text-[#222] sm:text-lg">Recent activities</h2>
        <p className="mt-1 text-xs leading-5 text-[#595959]">A simple record of what has been happening in your store.</p>
      </div>

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
                    <p className="text-sm leading-6 text-[#222]">{truncateWords(log.description, 12)}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{log.timestamp ? dayjs(log.timestamp).fromNow() : "Recently"}</p>
                  </div>
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
