import { useNavigate } from "react-router-dom";
import usePopularBlogs from "./PopularBlog";
import { baseUrl } from "../../Constant/Constant";

export default function AdvertBlogs() {
  const { blogs, loading, error } = usePopularBlogs();
  const navigate = useNavigate();

  if (loading || error || !blogs?.length) {
    return null;
  }

  return (
    <section className="mm-section">
      <div className="mm-container">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              FROM THE COMMUNITY
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">
              Latest from our blog
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Stories, ideas, and useful reads from the Maa Mara community.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mm-mobile-horizontal-scroll mm-mobile-blog-rail">
            {blogs.slice(0, 3).map((blog) => (
              <article
                key={blog.id}
                className="overflow-hidden rounded-2xl border border-border bg-background mm-mobile-blog-card"
              >
                {blog.image && (
                  <div className="m-2 overflow-hidden rounded-xl">
                    <img
                      src={`${baseUrl}${blog.image}`}
                      alt={blog.title || "Blog post"}
                      loading="lazy"
                      className="aspect-[16/9] w-full rounded-xl object-cover"
                    />
                  </div>
                )}

                <div className="px-4 pb-4 pt-2">
                  <h3 className="line-clamp-2 text-sm font-semibold text-card-foreground">
                    {blog.title || "Community story"}
                  </h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                    {blog.description || blog.excerpt || "Read more from the Maa Mara community."}
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate(`/blogs/${blog.id}`)}
                    className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-card-foreground transition-colors hover:bg-muted"
                  >
                    Read article
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}