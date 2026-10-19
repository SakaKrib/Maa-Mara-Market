import { useEffect, useState } from "react";
import api from "../../../../src/Services/Api";
import BlogCard from "./BlogCard";

export default function BlogFeed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const fetchPosts = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await api.get("/api/blogs/");
        const payload = response.data;
        const blogs = Array.isArray(payload) ? payload : payload?.results || [];
        if (active) setPosts(blogs.filter((post) => post.approved === true));
      } catch (requestError) {
        console.error("Error fetching blogs:", requestError);
        if (active) setError("We couldn't load the blog feed. Please try again.");
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchPosts();
    return () => { active = false; };
  }, []);

  return (
    <main className="mm-page min-h-[60vh] py-6 sm:py-8">
      <section className="mm-container">
        <header className="mb-6 border-b border-border pb-5 sm:mb-8">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            From the community
          </p>
          <h1 className="mt-1 font-serif text-2xl font-semibold text-foreground sm:text-3xl">
            The Maamara Market Blog
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            Discover stories, ideas and updates shared by our marketplace community.
          </p>
        </header>

        {loading ? (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3" aria-label="Loading blog posts">
            {[0, 1, 2].map((item) => (
              <div key={item} className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="aspect-[16/9] animate-pulse bg-muted" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
                  <div className="h-5 w-4/5 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 inline-flex min-h-10 items-center justify-center rounded-full bg-primary px-5 text-sm font-semibold text-primary-foreground">
              Try again
            </button>
          </div>
        ) : posts.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card px-5 py-12 text-center">
            <h2 className="font-serif text-xl font-semibold text-card-foreground">No stories yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">New community stories will appear here when they are published.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
            {posts.map((post) => <BlogCard key={post.id} post={post} />)}
          </div>
        )}
      </section>
    </main>
  );
}
