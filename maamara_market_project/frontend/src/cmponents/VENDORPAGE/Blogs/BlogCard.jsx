import { useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { sanitizeRichText } from "../../../utils/sanitizeRichText";
import { resolveApiAssetUrl } from "../../../Services/Api";
import ReactionButton from "./Reaction";
import CommentBox from "./Comment";

dayjs.extend(relativeTime);

const stripMarkup = (html = "") => html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export default function BlogCard({ post }) {
  const navigate = useNavigate();
  if (!post) return null;

  const vendor = post.vendor || {};
  const openPost = () => navigate(`/blogs/${post.id}`);
  const excerpt = post.excerpt || stripMarkup(post.content || "");
  const hasMedia = Boolean(post.image || post.video);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-custom transition-shadow hover:shadow-lg">
      <div className="flex items-center gap-3 px-4 pb-3 pt-4 sm:px-5">
        {vendor.profile_picture ? (
          <img src={resolveApiAssetUrl(vendor.profile_picture)} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-border" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-muted-foreground">
            {(vendor.company_name || "M").trim().charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-card-foreground">{vendor.company_name || "Maamara Market community"}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{post.created_at ? dayjs(post.created_at).fromNow() : "Community story"}</p>
        </div>
      </div>

      {hasMedia && (
        <button type="button" onClick={openPost} aria-label={`Read ${post.title || "blog post"}`} className="block w-full overflow-hidden bg-muted text-left">
          {post.image ? (
            <img src={resolveApiAssetUrl(post.image)} alt={post.title || "Blog post"} loading="lazy" className="aspect-[16/9] w-full object-cover transition-transform duration-300 hover:scale-[1.02]" />
          ) : (
            <video src={resolveApiAssetUrl(post.video)} preload="metadata" muted playsInline className="aspect-[16/9] w-full object-cover" />
          )}
        </button>
      )}

      <div className="flex flex-1 flex-col px-4 pb-4 pt-4 sm:px-5">
        <button type="button" onClick={openPost} className="text-left font-serif text-xl font-semibold leading-snug text-card-foreground transition-colors hover:text-primary">
          {post.title || "Community story"}
        </button>

        <p className="mt-2 line-clamp-4 text-sm leading-6 text-muted-foreground">
          {excerpt || "Read the latest story from our marketplace community."}
        </p>

        {!post.image && post.video && (
          <p className="mt-2 text-xs text-muted-foreground">Video story · Open the article to watch</p>
        )}

        <div className="mt-4">
          <button type="button" onClick={openPost} className="inline-flex min-h-9 items-center rounded-full border border-border bg-background px-4 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted">
            Read article
          </button>
        </div>

        <div className="mt-4 border-t border-border pt-3">
          <ReactionButton postId={post.id} reactions={post.reactions || []} />
          <CommentBox postId={post.id} comments={post.comments || []} compact />
        </div>
      </div>
    </article>
  );
}
