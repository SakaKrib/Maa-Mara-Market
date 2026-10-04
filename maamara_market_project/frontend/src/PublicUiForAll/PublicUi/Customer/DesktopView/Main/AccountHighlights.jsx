import React, { useEffect, useMemo, useState } from "react";
import { ChevronRight, Compass, FilePenLine, Loader2, MessageCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";
import "./AccountHighlights.css";

const AccountHighlights = () => {
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);

  const loadMessageCount = async () => {
    try {
      const response = await api.get("/api/messaging/conversations/", { withCredentials: true });
      const conversations = response.data?.results || [];
      setMessageUnreadCount(
        conversations.reduce(
          (total, conversation) => total + Number(conversation?.unread_count || 0),
          0
        )
      );
    } catch (_) {
      setMessageUnreadCount(0);
    }
  };

  useEffect(() => {
    let active = true;

    const load = async () => {
      const results = await Promise.allSettled([
        api.get("/api/vendor-draft/", { withCredentials: true }),
        api.get("/api/messaging/conversations/", { withCredentials: true }),
      ]);

      if (!active) return;

      const draftResult = results[0];
      const conversationResult = results[1];

      setDraft(
        draftResult.status === "fulfilled" && draftResult.value.data?.exists
          ? draftResult.value.data
          : null
      );
      const conversations =
        conversationResult.status === "fulfilled"
          ? conversationResult.value.data?.results || []
          : [];
      setMessageUnreadCount(
        conversations.reduce(
          (total, conversation) => total + Number(conversation?.unread_count || 0),
          0
        )
      );
      setLoading(false);
    };

    load();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const refreshMessages = () => loadMessageCount();
    window.addEventListener("maa-mara-messages-updated", refreshMessages);
    return () => window.removeEventListener("maa-mara-messages-updated", refreshMessages);
  }, []);

  const unreadMessages = messageUnreadCount;

  const updates = useMemo(() => {
    const next = [];

    if (draft) {
      const draftData = draft.draft || {};
      const itemCount = Array.isArray(draftData.item_list)
        ? draftData.item_list.length
        : 0;
      const updatedLabel = draft.updated_at
        ? new Date(draft.updated_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "";

      next.push({
        key: "draft",
        kicker: "SAVED DRAFT",
        title: "Pick up where you left off",
        description:
          (itemCount
            ? itemCount + " item" + (itemCount === 1 ? "" : "s") + " saved"
            : "Your registration details are saved") +
          (updatedLabel ? " · updated " + updatedLabel : ""),
        icon: FilePenLine,
        action: () => navigate("/vendor-register-form"),
        label: "Continue your vendor registration draft",
      });
    }

    next.push({
      key: "messages",
      kicker: "MESSAGES",
      title: "Check your messages",
      description:
        unreadMessages > 0
          ? unreadMessages + " unread message" + (unreadMessages === 1 ? "" : "s")
          : "Open your conversations with the Maa Mara team.",
      icon: MessageCircle,
      action: () => navigate("/messages"),
      label: "Open your messages",
    });

    next.push({
      key: "discover",
      kicker: "MARKETPLACE",
      title: "Discover what's new",
      description: "Explore products and shops on Maa Mara Market.",
      icon: Compass,
      action: () => {
        navigate("/");
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      label: "Explore the marketplace",
    });

    return next;
  }, [draft, unreadMessages, navigate]);

  useEffect(() => {
    setActiveIndex((current) => Math.min(current, Math.max(updates.length - 1, 0)));

    if (updates.length <= 1) return undefined;

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % updates.length);
    }, 5000);

    return () => window.clearInterval(timer);
  }, [updates.length]);

  if (loading) {
    return (
      <section className="mm-account-highlights mm-container" aria-label="Account updates">
        <div className="mm-account-highlight-loading">
          <Loader2 className="animate-spin" size={18} />
          <span>Loading your updates…</span>
        </div>
      </section>
    );
  }

  if (!updates.length) return null;

  const activeUpdate = updates[activeIndex] || updates[0];
  const Icon = activeUpdate.icon;

  return (
    <section className="mm-account-highlights mm-container" aria-label="Your marketplace updates">
      <div className="mm-account-highlights-heading">
        <div>
          <span className="mm-eyebrow">YOUR MARKETPLACE</span>
          <h2>{activeUpdate.title}</h2>
        </div>

        <div className="mm-update-indicators" aria-label="Update rotation">
          {updates.map((update, index) => (
            <button
              key={update.key}
              type="button"
              className={index === activeIndex ? "active" : ""}
              onClick={() => setActiveIndex(index)}
              aria-label={"Show " + update.title}
              aria-current={index === activeIndex ? "true" : undefined}
            />
          ))}
        </div>
      </div>

      <button
        type="button"
        className="mm-account-highlight-card"
        onClick={activeUpdate.action}
        aria-label={activeUpdate.label}
      >
        <span className="mm-highlight-icon">
          <Icon size={20} />
        </span>

        <span className="mm-highlight-copy">
          <span className="mm-highlight-kicker">{activeUpdate.kicker}</span>
          <strong>{activeUpdate.title}</strong>
          <span>{activeUpdate.description}</span>
        </span>

        <ChevronRight size={19} className="mm-highlight-arrow" />
      </button>
    </section>
  );
};

export default AccountHighlights;
