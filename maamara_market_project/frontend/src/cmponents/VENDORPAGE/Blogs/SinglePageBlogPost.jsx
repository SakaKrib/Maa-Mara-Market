import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api, { resolveApiAssetUrl } from "../../../Services/Api";
import ReactionButton from "./Reaction";
import CommentBox from "./Comment";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { sanitizeRichText } from "../../../utils/sanitizeRichText";

dayjs.extend(relativeTime);

export default function SingleBlogPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    api.get("/api/blogs/" + id + "/")
      .then((response) => {
        if (active) setPost(response.data);
      })
      .catch((requestError) => {
        console.error("Failed to load blog post:", requestError);
        if (active) setError("This blog post could not be loaded.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [id]);

  // Count one read per browser session so refreshes do not inflate views.
  useEffect(() => {
    if (!id) return;
    const key = "blog-viewed-" + id;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      // Storage unavailable: still attempt to count this view.
    }
    api.post("/api/blogs/" + id + "/view/").catch(() => {});
  }, [id]);

  if (loading) {
    return <main className="mm-page min-h-[60vh] py-10"><div className="mm-container text-center text-sm text-muted-foreground">Loading blog post…</div></main>;
  }

  if (error || !post) {
    return (
      <main className="mm-page min-h-[60vh] py-10">
        <div className="mm-container">
          <div className="rounded-2xl border border-border bg-card px-5 py-10 text-center">
            <h1 className="font-serif text-2xl font-semibold text-card-foreground">Blog post unavailable</h1>
            <p className="mt-2 text-sm text-muted-foreground">{error || "This blog post could not be found."}</p>
            <button type="button" onClick={() => navigate("/blogs")} className="mt-5 inline-flex min-h-10 items-center rounded-[20px] bg-primary px-5 text-sm font-semibold text-primary-foreground">Back to blog feed</button>
          </div>
        </div>
      </main>
    );
  }

  const vendor = post.vendor || {};

  return (
    <main className="mm-page min-h-[60vh] py-5 sm:py-8">
      <div className="mm-container">
        <button type="button" onClick={() => navigate("/blogs")} className="mb-5 inline-flex min-h-9 items-center rounded-[20px] border border-border bg-card px-4 text-sm font-medium text-card-foreground transition-colors hover:bg-muted">
          ← Back to blog feed
        </button>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-8">
          <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-custom">
            <header className="flex items-center gap-3 border-b border-border px-4 py-4 sm:px-6">
              {vendor.vendor_company_logo ? (
                <img src={resolveApiAssetUrl(vendor.vendor_company_logo)} alt="" className="h-11 w-11 shrink-0 rounded-full object-contain ring-1 ring-border" />
              ) : (
                <div aria-label={(vendor.company_name || "Maamara Market").trim() + " logo unavailable"} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
                  {((vendor.company_name || "Maamara Market").trim().charAt(0) || "M").toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-card-foreground">{vendor.company_name || "Maamara Market community"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{post.created_at ? dayjs(post.created_at).fromNow() : "Community story"}</p>
              </div>
              {typeof post.view_count === "number" && <span className="shrink-0 text-xs text-muted-foreground">{post.view_count} views</span>}
            </header>

            {post.image && (
              <img src={resolveApiAssetUrl(post.image)} alt={post.title || "Blog image"} className="max-h-[560px] w-full bg-muted object-contain" />
            )}

            {post.video && (
              <div className="bg-black">
                <video controls playsInline preload="metadata" src={resolveApiAssetUrl(post.video)} className="mx-auto max-h-[560px] w-full" />
              </div>
            )}

            <div className="px-4 py-5 sm:px-6 sm:py-7">
              <h1 className="font-serif text-2xl font-semibold leading-tight text-card-foreground sm:text-3xl lg:text-4xl">
                {post.title || "Community story"}
              </h1>

              <div
                className="blog-rich-text mt-5 max-w-none break-words text-sm leading-7 text-card-foreground sm:text-base [&_p]:mb-4 [&_h1]:mb-5 [&_h1]:text-3xl [&_h1]:font-bold [&_h2]:mb-4 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-3 [&_h3]:text-xl [&_h3]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-primary [&_a]:underline [&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-muted [&_pre]:p-4"
                dangerouslySetInnerHTML={{ __html: sanitizeRichText(post.content || "") }}
              />

              <div className="mt-6 border-t border-border pt-4">
                <ReactionButton postId={post.id} reactions={post.reactions || []} />
              </div>

              {post.item && (
                <button type="button" onClick={() => navigate("/item/" + post.item)} className="mt-5 inline-flex min-h-10 items-center rounded-[20px] bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90">
                  Shop the featured item
                </button>
              )}
            </div>
          </article>

          <aside className="min-w-0 rounded-2xl border border-border bg-card p-4 sm:p-5 lg:sticky lg:top-6">
            <h2 className="font-serif text-xl font-semibold text-card-foreground">Join the conversation</h2>
            <p className="mt-1 text-sm text-muted-foreground">Share your thoughts about this story.</p>
            <div className="mt-4">
              <CommentBox postId={post.id} comments={post.comments || []} />
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
