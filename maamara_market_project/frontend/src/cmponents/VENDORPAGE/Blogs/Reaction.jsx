import { useEffect, useMemo, useState } from "react";
import api from "../../../../src/Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";

const readVisitorId = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\\s*)visitorId=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

export default function ReactionButton({ postId, reactions: initialReactions = [] }) {
  const [reactions, setReactions] = useState(initialReactions || []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const { user } = useAuth();
  const visitorId = readVisitorId();

  useEffect(() => setReactions(initialReactions || []), [initialReactions]);

  const myReaction = useMemo(() => {
    if (user?.id) {
      return reactions.find((reaction) => Number(reaction.user_id ?? reaction.user) === Number(user.id));
    }
    return visitorId ? reactions.find((reaction) => reaction.visitor_id === visitorId) : null;
  }, [reactions, user?.id, visitorId]);

  const counts = useMemo(() => reactions.reduce((result, reaction) => {
    if (reaction.type) result[reaction.type] = (result[reaction.type] || 0) + 1;
    return result;
  }, {}), [reactions]);

  const handleReact = async (type) => {
    if (submitting || myReaction) return;
    setSubmitting(true);
    setMessage("");
    try {
      const response = await api.post(`/api/blogs/${postId}/react/`, { type });
      const savedReaction = response.data;
      setReactions((current) => {
        if (current.some((reaction) => reaction.id === savedReaction.id)) return current;
        return [...current, savedReaction];
      });
      setMessage("Thanks for reacting.");
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(detail || "Your reaction couldn't be saved. Please try again.");
      console.error("Failed to react to blog:", error);
    } finally {
      setSubmitting(false);
    }
  };

  const choices = [
    { type: "like", label: "Like", emoji: "👍" },
    { type: "love", label: "Love", emoji: "❤️" },
    { type: "fire", label: "Fire", emoji: "🔥" },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2" aria-label="Blog reactions">
        {choices.map(({ type, label, emoji }) => {
          const selected = myReaction?.type === type;
          const disabled = submitting || Boolean(myReaction);
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleReact(type)}
              disabled={disabled}
              aria-pressed={selected}
              title={myReaction && !selected ? "You have already reacted to this post" : label}
              className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-card-foreground hover:bg-muted"}`}
            >
              <span aria-hidden="true">{emoji}</span>
              <span>{label}</span>
              <span className="tabular-nums">{counts[type] || 0}</span>
            </button>
          );
        })}
      </div>
      {message && <p role="status" className="mt-2 text-xs text-muted-foreground">{message}</p>}
    </div>
  );
}
