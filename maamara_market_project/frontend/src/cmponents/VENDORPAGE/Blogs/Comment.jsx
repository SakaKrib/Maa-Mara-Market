import { useEffect, useState } from "react";
import api from "../../../../src/Services/Api";

export default function CommentBox({ postId, comments: initialComments = [], compact = false }) {
  const [text, setText] = useState("");
  const [comments, setComments] = useState(initialComments || []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => setComments(initialComments || []), [initialComments]);

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
          {comments.map((comment) => (
            <div key={comment.id} className="rounded-xl bg-muted/60 px-3 py-2">
              <p className="text-xs font-semibold text-card-foreground">{comment.user_name || (comment.visitor_id ? "Guest" : "Community member")}</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-5 text-muted-foreground">{comment.text}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">Be the first to join the conversation.</p>
      )}

      <form onSubmit={handleComment} className="flex items-end gap-2">
        <label className="min-w-0 flex-1">
          <span className="sr-only">Write a comment</span>
          <textarea
            rows={1}
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={2000}
            placeholder="Write a comment..."
            className="min-h-10 w-full resize-y rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-primary/30"
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
