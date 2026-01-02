import { useState } from "react";
import api from "../../../../src/Services/Api";
import { useAuth } from "../../Auth/AuthContext/Context";

export default function ReactionButton({ postId, reactions: initialReactions }) {
  const [reactions, setReactions] = useState(initialReactions || []);
  const { user } = useAuth();

  // Check if current user (or visitor) has reacted with this type
  const hasReacted = (type) => {
    if (user?.id) {
      return reactions.some(r => r.user === user.id && r.type === type);
    }
    // For visitors, we can't check the visitorId in frontend, just rely on backend data
    return false;
  };

  const handleReact = async (type) => {
    try {
      if (hasReacted(type)) {
        // Remove reaction for current user/visitor
        await api.delete(`/api/blogs/${postId}/remove_reaction/`);
        setReactions(prev =>
          user
            ? prev.filter(r => !(r.user === user.id && r.type === type))
            : prev // for visitors, backend will handle removal
        );
      } else {
        // Add reaction
        const res = await api.post(`/api/blogs/${postId}/react/`, { type });
        const newReaction = res.data;
        setReactions(prev => [...prev.filter(r => r.id !== newReaction.id), newReaction]);
      }
    } catch (err) {
      console.error("Failed to react:", err);
    }
  };

  const countType = (type) => reactions.filter(r => r.type === type).length;
  const isActive = (type) => hasReacted(type);

  return (
    <div className="flex gap-2">
      <button
        className={isActive("like") ? "text-blue-600 font-bold" : ""}
        onClick={() => handleReact("like")}
      >
        👍 {countType("like")}
      </button>
      <button
        className={isActive("love") ? "text-red-600 font-bold" : ""}
        onClick={() => handleReact("love")}
      >
        ❤️ {countType("love")}
      </button>
      <button
        className={isActive("fire") ? "text-orange-600 font-bold" : ""}
        onClick={() => handleReact("fire")}
      >
        🔥 {countType("fire")}
      </button>
    </div>
  );
}
