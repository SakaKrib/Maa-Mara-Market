import { useEffect, useState } from "react";
import api from "../../../../src/Services/Api";

export default function CommentBox({ postId, comments: initialComments = [], compact = false }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(initialComments || []);
  const [showAllComments, setShowAllComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setComments(initialComments || []), [initialComments]);

  const canExpandComments = compact && comments.length > 2;
  const visibleComments = compact && !showAllComments ? comments.slice(0, 2) : comments;

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
        <span className="text-xs text-muted-foreground">{comments.length}</span>
      </div>

      {comments.length > 0 ? (
        <div className={`mb-3 space-y-2 ${compact ? "max-h-36 overflow-y-auto pr-1" : "max-h-80 overflow-y-auto pr-1"}`}>
          {visibleComments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-muted/60 px-3 py-2">
              <p className="text-xs font-semibold text-card-foreground">{comment.user_name || (comment.visitor_id ? "Guest" : "Community member")}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Be the first to join the conversation.</p>
      )}

      {canExpandComments && (
        <button
          type="button"
          onClick={() => setShowAllComments((current) => !current)}
          aria-expanded={showAllComments}
          className="mb-3 inline-flex min-h-8 items-center gap-1 rounded-full px-2 text-xs font-semibold text-primary transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          {showAllComments ? "Hide Comments" : `View Comments (${comments.length})`}
          <span aria-hidden="true">{showAllComments ? "▴" : "▾"}</span>
        </button>
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
    </section>
  );
}
