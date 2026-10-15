import React, { useState } from "react";
import { Bell, Trash2, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useVendorNotifications } from "../../../Hooks/VendorNotificationHook/VendorNotificationsHook";
import { useAdminPreferences } from "../../../Settings/AdminPreferencesContext";

export default function VendorNotifications() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { preferences } = useAdminPreferences();
  const notificationsEnabled = preferences.notifications;
  const {
    notifications = [],
    unseenCount = 0,
    deleteNotification,
    markNotificationSeen,
    clearAllNotifications,
  } = useVendorNotifications({ enabled: notificationsEnabled });
  const [actionError, setActionError] = useState("");

  const handleDeleteNotification = async (notificationId) => {
    if (!window.confirm("Delete this notification? This cannot be undone.")) return;
    try {
      setActionError("");
      await deleteNotification(notificationId);
    } catch (deleteError) {
      setActionError("We couldn't delete that notification. Please try again.");
    }
  };

  const handleClearAllNotifications = async () => {
    if (!window.confirm("Clear all of your notifications? This cannot be undone.")) return;
    try {
      setActionError("");
      await clearAllNotifications();
    } catch (clearError) {
      setActionError("We couldn't clear your notifications. Please try again.");
    }
  };

  const handleNotificationClick = async (notification) => {
    try {
      await markNotificationSeen(notification.id);
    } catch {
      // Keep the notification actionable even if the read receipt fails.
    }
    if (notification.url) navigate(notification.url);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        onClick={() => notificationsEnabled && setOpen(true)}
        className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#d9d9d6] bg-white text-[#222] shadow-sm transition focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 ${notificationsEnabled ? "hover:border-[#2563eb] hover:bg-[#eff6ff] hover:text-[#2563eb]" : "cursor-not-allowed opacity-50"}`}
        aria-label={notificationsEnabled ? "Open notifications" : "Notifications disabled"}
        title={notificationsEnabled ? "Open notifications" : "Notifications are disabled in settings"}
      >
        <Bell className="h-5 w-5" strokeWidth={2.2} />
        {unseenCount > 0 && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-red-600 px-1.5 py-0.5 text-[10px] font-bold leading-4 text-white shadow-sm">
            {unseenCount > 99 ? "99+" : unseenCount}
          </span>
        )}
      </button>

      {open && notificationsEnabled && (
        <aside
          className="fixed inset-y-4 right-4 z-[1500] flex w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#e6e6e4] bg-white shadow-2xl"
          role="dialog"
          aria-modal="false"
          aria-label="Vendor notifications"
        >
          <div className="flex items-center justify-between border-b border-[#e6e6e4] px-5 py-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
                Updates
              </p>
              <h2 className="mt-1 text-lg font-bold text-[#222]">Notifications</h2>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#d9d9d6] text-[#595959] transition hover:bg-[#f8f8f6] hover:text-[#222]"
              aria-label="Close notifications"
            >
              <X size={17} />
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto bg-[#f8f8f6] p-4">
            {actionError && (
              <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {actionError}
              </p>
            )}
            {notifications.length > 0 && (
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="text-xs text-[#595959]">{notifications.length} notification{notifications.length === 1 ? "" : "s"}</p>
                <button
                  type="button"
                  onClick={handleClearAllNotifications}
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Clear all
                </button>
              </div>
            )}
            {notifications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-8 text-center">
                <Bell className="mx-auto h-7 w-7 text-[#595959]" />
                <p className="mt-3 text-sm font-semibold text-[#222]">No notifications yet</p>
                <p className="mt-1 text-xs text-[#595959]">
                  New store updates will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-2 rounded-2xl border bg-white p-3 shadow-sm ${
                      notification.seen
                        ? "border-[#e6e6e4]"
                        : "border-[#2563eb]/30 ring-1 ring-[#2563eb]/10"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleNotificationClick(notification)}
                      className="min-w-0 flex-1 rounded-xl p-1 text-left transition hover:bg-[#f8f8f6] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-sm font-bold text-[#222]">{notification.display_title || notification.title || "Maa Mara Market update"}</p>
                        {!notification.seen && (
                          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[#2563eb]" />
                        )}
                      </div>
                      <p className="mt-1 text-sm leading-6 text-[#595959]">
                        {notification.display_message || notification.message || "There is a new update in your marketplace workspace."}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteNotification(notification.id)}
                      aria-label="Delete notification"
                      title="Delete notification"
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-red-200 text-red-700 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      )}
    </>
  );
}
