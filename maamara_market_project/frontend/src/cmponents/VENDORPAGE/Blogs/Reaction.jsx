import { useEffect, useMemo, useState } from "react";
import api from "../../../../src/Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";

const readVisitorId = () => {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(/(?:^|;\s*)visitorId=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : "";
};

export default function ReactionButton({ postId, reactions: initialReactions = [] }) {
  const [reactions, setReactions] = useState(initialReactions || []);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [myReactionId, setMyReactionId] = useState(null);
  const { user } = useAuth();
  const visitorId = readVisitorId();

  useEffect(() => setReactions(initialReactions || []), [initialReactions]);

  const myReaction = useMemo(() => {
    const savedByThisComponent = reactions.find((reaction) => reaction.id === myReactionId);
    if (savedByThisComponent) return savedByThisComponent;
    if (user?.id) {
      return reactions.find((reaction) => Number(reaction.user_id ?? reaction.user) === Number(user.id));
    }
    return visitorId ? reactions.find((reaction) => reaction.visitor_id === visitorId) : null;
  }, [reactions, user?.id, visitorId, myReactionId]);

  const counts = useMemo(() => reactions.reduce((result, reaction) => {
    if (reaction.type) result[reaction.type] = (result[reaction.type] || 0) + 1;
    return result;
  }, {}), [reactions]);

  const handleReact = async (type) => {
    if (submitting) return;

    setSubmitting(true);
    setMessage("");
    try {
      if (myReaction?.type === type) {
        await api.delete("/api/blogs/" + postId + "/remove_reaction/");
        setReactions((current) => current.filter((reaction) => reaction.id !== myReaction.id));
        setMyReactionId(null);
        setMessage("Reaction removed.");
        return;
      }

      const response = await api.post("/api/blogs/" + postId + "/react/", { type });
      const savedReaction = response.data;
      setMyReactionId(savedReaction.id);
      setReactions((current) => {
        const existingIndex = current.findIndex((reaction) =>
          reaction.id === savedReaction.id ||
          (user?.id && Number(reaction.user_id ?? reaction.user) === Number(user.id)) ||
          (!user?.id && visitorId && reaction.visitor_id === visitorId)
        );
        if (existingIndex < 0) return [...current, savedReaction];
        return current.map((reaction, index) => index === existingIndex ? savedReaction : reaction);
      });
      setMessage(myReaction ? "Reaction updated." : "Thanks for reacting.");
    } catch (error) {
      const detail = error.response?.data?.detail;
      setMessage(detail || "Your reaction couldn't be updated. Please try again.");
      console.error("Failed to update blog reaction:", error);
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
          return (
            <button
              key={type}
              type="button"
              onClick={() => handleReact(type)}
              disabled={submitting}
              aria-pressed={selected}
              title={selected ? "Click again to remove your reaction" : label}
              className={"inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold transition-colors disabled:cursor-wait disabled:opacity-70 " + (selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-card-foreground hover:bg-muted")}
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
