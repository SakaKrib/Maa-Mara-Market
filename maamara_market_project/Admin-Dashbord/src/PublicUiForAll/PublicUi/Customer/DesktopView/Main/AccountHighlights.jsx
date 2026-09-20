import React, { useEffect, useState } from "react";
import { Bell, ChevronRight, FilePenLine, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";
import "./AccountHighlights.css";

const AccountHighlights = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const results = await Promise.allSettled([
        api.get("/api/vendor-draft/", { withCredentials: true }),
        api.get("/api/user-visitor-notifications/", { withCredentials: true }),
      ]);
      if (!active) return;
      const draftResult = results[0];
      const notificationResult = results[1];
      setDraft(draftResult.status === "fulfilled" && draftResult.value.data?.exists ? draftResult.value.data : null);
      setNotifications(notificationResult.status === "fulfilled" ? (notificationResult.value.data?.results || []) : []);
      setLoading(false);
    };
    load();
    return () => { active = false; };
  }, []);

  const unread = notifications.filter((item) => !item.is_read).length;
  const visibleNotifications = notifications.slice(0, 3);
  const draftData = draft?.draft || {};
  const itemCount = Array.isArray(draftData.item_list) ? draftData.item_list.length : 0;
  const updatedLabel = draft?.updated_at
    ? new Date(draft.updated_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";

  if (loading) {
    return <section className="mm-account-highlights mm-container" aria-label="Account updates"><div className="mm-account-highlight-loading"><Loader2 className="animate-spin" size={18} /><span>Loading your updates…</span></div></section>;
  }

  if (!draft && !notifications.length) return null;

  return (
    <section className="mm-account-highlights mm-container" aria-label="Your account updates">
      <div className="mm-account-highlights-heading">
        <div><span className="mm-eyebrow">YOUR MARKETPLACE</span><h2>Pick up where you left off</h2></div>
        {unread > 0 && <button type="button" className="mm-notification-summary" onClick={() => navigate("/profile")}><Bell size={16} />{unread} new</button>}
      </div>
      <div className="mm-account-highlight-grid">
        {draft && (
          <button type="button" className="mm-progress-card" onClick={() => navigate("/vendor-register-form")} aria-label="Continue your vendor registration draft">
            <span className="mm-highlight-icon"><FilePenLine size={20} /></span>
            <span className="mm-highlight-copy">
              <span className="mm-highlight-kicker">SAVED DRAFT</span>
              <strong>{draftData.company_name || "Vendor registration"}</strong>
              <span>{itemCount ? (itemCount + " item" + (itemCount === 1 ? "" : "s") + " saved") : "Registration details saved"}{updatedLabel ? (" · updated " + updatedLabel) : ""}</span>
            </span>
            <ChevronRight size={19} className="mm-highlight-arrow" />
          </button>
        )}
        {notifications.length > 0 && (
          <button type="button" className="mm-notification-card" onClick={() => navigate("/profile")} aria-label="Open your notifications">
            <span className="mm-highlight-icon"><Bell size={20} /></span>
            <span className="mm-highlight-copy">
              <span className="mm-highlight-kicker">NOTIFICATIONS</span>
              <strong>{unread ? (unread + " new notification" + (unread === 1 ? "" : "s")) : "Recent updates"}</strong>
              <span>{visibleNotifications[0]?.title || visibleNotifications[0]?.message || "View your account updates"}</span>
            </span>
            <ChevronRight size={19} className="mm-highlight-arrow" />
          </button>
        )}
      </div>
    </section>
  );
};

export default AccountHighlights;
