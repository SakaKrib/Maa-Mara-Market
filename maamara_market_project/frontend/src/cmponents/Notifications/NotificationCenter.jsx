import React, { useState } from "react";
import { Bell, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendorNotifications } from "../Hooks/VendorNotificationHook/VendorNotificationsHook";
import { useAdminPreferences } from "../Settings/AdminPreferencesContext";
import { useAuth } from "../Auth/AuthContext/Context";

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { preferences } = useAdminPreferences();
  const { isAuthenticated, loading: authLoading } = useAuth();
  // Do not request the protected admin/vendor notification feed until the
  // auth cookie check has completed and a signed-in user is confirmed.
  const enabled = Boolean(preferences.notifications && !authLoading && isAuthenticated);
  const {
    notifications = [],
    unseenCount = 0,
    markNotificationSeen,
    deleteNotification,
    clearAllNotifications,
  } = useVendorNotifications({ enabled });
  const [error, setError] = useState("");

  const openNotification = async (notification) => {
    try {
      await markNotificationSeen(notification.id);
    } catch {
      setError("This update could not be marked as read, but you can still open it.");
    }
    setOpen(false);
    if (notification.url) navigate(notification.url);
  };

  const clearAll = async () => {
    if (!window.confirm("Clear all notifications? This cannot be undone.")) return;
    try {
      setError("");
      await clearAllNotifications();
    } catch {
      setError("We couldn't clear notifications. Please try again.");
    }
  };

  return (
    <div className="fixed right-4 top-20 z-[1450]">
      <button
        type="button"
        onClick={() => enabled && setOpen((value) => !value)}
        className="relative inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-800 shadow-lg transition hover:border-blue-400 hover:bg-blue-50"
        aria-label={enabled ? "Open notifications" : "Notifications disabled"}
        title={enabled ? "Notifications" : "Notifications are disabled in settings"}
      >
        <Bell className="h-5 w-5" />
        {unseenCount > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white">{unseenCount > 99 ? "99+" : unseenCount}</span>}
      </button>

      {open && enabled && (
        <aside className="fixed top-[calc(env(safe-area-inset-top,0px)+5rem)] bottom-[calc(env(safe-area-inset-bottom,0px)+5rem)] right-4 z-[1500] flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl" role="dialog" aria-label="Notifications">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-blue-700">Updates</p>
              <h2 className="mt-1 text-lg font-bold">Notifications</h2>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50" aria-label="Close notifications"><X size={17} /></button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50 p-4">
            {error && <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">{error}</p>}
            {notifications.length > 0 && <div className="mb-3 flex items-center justify-between gap-3"><p className="text-xs text-slate-500">{notifications.length} update{notifications.length === 1 ? "" : "s"}</p><button type="button" onClick={clearAll} className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" />Clear all</button></div>}
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center"><Bell className="mx-auto h-7 w-7 text-slate-400" /><p className="mt-3 text-sm font-semibold">No notifications yet</p><p className="mt-1 text-xs text-slate-500">Order and account updates will appear here.</p></div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div key={notification.id} className={`flex items-start gap-2 rounded-2xl border bg-white p-3 shadow-sm ${notification.seen ? "border-slate-200" : "border-blue-300 ring-1 ring-blue-100"}`}>
                    <button type="button" onClick={() => openNotification(notification)} className="min-w-0 flex-1 rounded-xl p-1 text-left hover:bg-slate-50">
                      <span className="flex items-start justify-between gap-3"><span className="text-sm font-bold">{notification.display_title || notification.title || "Maa Mara Market update"}</span>{!notification.seen && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" />}</span>
                      <span className="mt-1 block text-sm leading-6 text-slate-600">{notification.display_message || notification.message || "There is a new update in your marketplace workspace."}</span>
                      <span className="mt-2 block text-xs font-semibold text-blue-700">Open update</span>
                    </button>
                    <button type="button" onClick={async () => { try { await deleteNotification(notification.id); } catch { setError("We couldn't delete that notification."); } }} aria-label="Delete notification" className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-700 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5" /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
