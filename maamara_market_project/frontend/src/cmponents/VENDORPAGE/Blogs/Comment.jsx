import { useEffect, useState } from "react";
import { resolveApiAssetUrl } from "../../../Services/Api";
import api from "../../../../src/Services/Api";

export default function CommentBox({ postId, comments: initialComments = [], compact = false }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(initialComments || []);
  const [showComments, setShowComments] = useState(!compact);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setComments(initialComments || []), [initialComments]);

  const commentsAreVisible = !compact || showComments;

  const handleComment = async (event) => {
    event.preventDefault();
    const commentText = text.trim();
    if (!commentText || submitting) return;

    setSubmitting(true);
    setError("");
    try {
      const response = await api.post(`/api/blogs/${postId}/comment/`, { text: commentText });
      const newComment = response.data;
      setComments((current) => current.some((comment) => comment.id === newComment.id) ? current : [...current, newComment]);
      setText("");
    } catch (requestError) {
      console.error("Failed to post blog comment:", requestError);
      setError(requestError.response?.data?.text?.[0] || requestError.response?.data?.detail || "Your comment couldn't be posted. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className={compact ? "mt-3" : "mt-6"} aria-label="Blog comments">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-card-foreground">Comments</h3>
        {compact ? (
          <button
            type="button"
            onClick={() => setShowComments((current) => !current)}
            aria-expanded={showComments}
            aria-label={showComments ? "Hide comments and comment form" : `Show ${comments.length} comments and comment form`}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full px-2 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-card-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <span>{comments.length}</span>
            <span aria-hidden="true" className="text-sm">{showComments ? "⌃" : "⌄"}</span>
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">{comments.length}</span>
        )}
      </div>

      {commentsAreVisible && (
        <>
          {comments.length > 0 ? (
            <div className={`mb-3 space-y-2 ${compact ? "max-h-36 overflow-y-auto pr-1" : "max-h-80 overflow-y-auto pr-1"}`}>
              {comments.map((comment) => {
                const isGuest = Boolean(comment.visitor_id && !comment.user_name);
                const displayName = comment.user_name || (comment.visitor_id ? "Guest" : "Community member");
                const initial = isGuest ? "G" : (displayName.trim().charAt(0) || "M").toUpperCase();
                return (
                  <div key={comment.id} className="flex items-start gap-2 rounded-xl bg-muted/60 px-3 py-2">
                    {comment.user_profile_picture ? (
                      <img src={resolveApiAssetUrl(comment.user_profile_picture)} alt="" className="mt-0.5 h-8 w-8 shrink-0 rounded-full object-cover ring-1 ring-border" />
                    ) : (
                      <div aria-hidden="true" className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background text-xs font-semibold text-muted-foreground ring-1 ring-border">{initial}</div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-card-foreground">{displayName}</p>
                      <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">{comment.text}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mb-3 text-xs text-muted-foreground">Be the first to join the conversation.</p>
          )}

      <form onSubmit={handleComment} className="flex items-center gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Write a comment</span>
          <textarea
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            placeholder="Write a comment..."
            className="min-h-10 w-full resize-y rounded-xl border border-[#222222] bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-black focus:ring-1 focus:ring-black"
          />
        </label>
        <button type="submit" disabled={!text.trim() || submitting} className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-[20px] bg-primary px-4 text-xs font-semibold text-primary-foreground transition-opacity disabled:cursor-not-allowed disabled:opacity-50">
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
      {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
        </>
      )}
    </section>
  );
}
