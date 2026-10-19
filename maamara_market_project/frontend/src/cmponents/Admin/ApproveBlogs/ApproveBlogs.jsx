import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { newspaperOutline, refreshOutline } from "ionicons/icons";
import api, { resolveApiAssetUrl } from "../../../Services/Api";
import AppSnackbar from "../../../../components/ui/app-snackbar";
import { sanitizeRichText } from "../../../utils/sanitizeRichText";

export default function AdminBlogApprovalPage({ onCountChange }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const showSnackbar = (message, severity = "success") => {
    setSnackbar({ open: true, message, severity });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const fetchBlogs = async () => {
    setLoading(true);
    try {
      const res = await api.get("/api/admin/blogs/");
      const list = res.data?.results || res.data || [];
      setBlogs(list);
      onCountChange?.(list.length);
    } catch (err) {
      console.error("Failed to fetch pending blogs:", err);
      showSnackbar(err?.response?.data?.detail || "Unable to load pending blogs.", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleAction = async (blog, action) => {
    setProcessingId(blog.id);
    try {
      await api.post(`/api/admin-approve/blogs/${blog.id}/${action}/`);
      const label = action === "approve" ? "approved" : "denied";
      showSnackbar(`Blog “${blog.title || "Untitled blog"}” ${label} successfully.`);
      setBlogs((current) => {
        const updated = current.filter((item) => item.id !== blog.id);
        onCountChange?.(updated.length);
        return updated;
      });
    } catch (err) {
      console.error(`Failed to ${action} blog:`, err);
      showSnackbar(err?.response?.data?.detail || `Unable to ${action} blog.`, "error");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <>
      <AppSnackbar
        open={snackbar.open}
        message={snackbar.message}
        severity={snackbar.severity}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
      />

      <section className="min-h-[calc(100vh-72px)] w-full bg-background text-foreground">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-6 flex flex-col gap-4 rounded-2xl border border-border bg-gradient-to-br from-card via-card to-muted/50 p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6 lg:p-7">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/10 sm:h-14 sm:w-14">
                <IonIcon icon={newspaperOutline} className="text-2xl sm:text-[27px]" />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">Content management</p>
                <h1 className="mt-1 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Blog approvals</h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
                  Review each vendor submission and decide what is ready to publish.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchBlogs}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[20px] border border-border bg-card px-5 text-sm font-semibold text-card-foreground shadow-sm transition hover:border-primary/30 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IonIcon icon={refreshOutline} />
              Refresh
            </button>
          </header>

          <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-6">
              <h2 className="text-base font-semibold sm:text-lg">Pending blog approvals</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {blogs.length} {blogs.length === 1 ? "blog" : "blogs"} awaiting review.
              </p>
            </div>

            {loading ? (
              <div className="p-8 text-center text-sm text-muted-foreground">Loading pending blogs…</div>
            ) : blogs.length === 0 ? (
              <div className="p-8 text-center">
                <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-muted">
                  <IonIcon icon={newspaperOutline} className="text-xl text-muted-foreground" />
                </div>
                <h3 className="text-sm font-medium sm:text-base">No pending blogs</h3>
                <p className="mt-1 text-sm text-muted-foreground">New vendor submissions will appear here for review.</p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {blogs.map((blog) => (
                  <article key={blog.id} className="p-4 transition-colors hover:bg-muted/20 sm:p-6">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="break-words text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                          {blog.title || "Untitled blog"}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          By {blog.vendor_name || blog.user_name || blog.vendor?.company_name || blog.user?.username || "Unknown vendor"}
                          {blog.created_at && <> · {new Date(blog.created_at).toLocaleDateString()}</>}
                        </p>

                        {blog.image && (
                          <img
                            src={resolveApiAssetUrl(blog.image)}
                            alt={blog.title || "Blog cover"}
                            className="mt-4 max-h-64 w-full rounded-xl border border-border object-cover sm:max-w-xl"
                          />
                        )}

                        <div
                          className="blog-rich-text mt-4 max-w-none break-words text-[15px] leading-7 text-foreground [&_p]:mb-4 [&_h1]:mb-3 [&_h1]:mt-5 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-lg [&_h3]:font-semibold [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5 [&_blockquote]:my-4 [&_blockquote]:rounded-r-lg [&_blockquote]:border-l-4 [&_blockquote]:border-primary [&_blockquote]:bg-background [&_blockquote]:py-2 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:font-medium [&_a]:text-primary [&_a]:underline"
                          dangerouslySetInnerHTML={{ __html: sanitizeRichText(blog.content || "") }}
                        />

                        {blog.video && (
                          <video
                            controls
                            playsInline
                            preload="metadata"
                            src={resolveApiAssetUrl(blog.video)}
                            className="mt-4 max-h-80 w-full rounded-xl border border-border bg-black sm:max-w-xl"
                          />
                        )}
                      </div>

                      <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
                        <button
                          type="button"
                          onClick={() => handleAction(blog, "approve")}
                          disabled={processingId === blog.id}
                          className="min-h-11 rounded-[20px] bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          {processingId === blog.id ? "Processing…" : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Deny “${blog.title || "this blog"}”? This will remove the pending submission and notify the vendor.`)) {
                              handleAction(blog, "deny");
                            }
                          }}
                          disabled={processingId === blog.id}
                          className="min-h-11 rounded-[20px] border border-destructive/30 bg-card px-5 text-sm font-semibold text-destructive transition hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
