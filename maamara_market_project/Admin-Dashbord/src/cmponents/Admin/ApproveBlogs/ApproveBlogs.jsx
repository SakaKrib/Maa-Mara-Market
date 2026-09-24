import { useEffect, useState, useRef } from "react";
import api from "../../../Services/Api";


export default function AdminBlogApprovalPage({ onCountChange }) {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFirstLoad = useRef(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  const showSnackbar = (message) => {
    setSnackbar({ open: true, message });
    window.setTimeout(() => setSnackbar((prev) => ({ ...prev, open: false })), 3000);
  };

  const fetchBlogs = async (silent = false) => {
    if (!silent) setLoading(true);

    try {
      const res = await api.get("api/admin/blogs/");
      const list = res.data?.results || [];

      setBlogs(list);

      // 🔑 report count upward
      onCountChange?.(list.length);

    } catch (err) {
      console.error("Failed to fetch blogs:", err);
    } finally {
      if (!silent) setLoading(false);
      isFirstLoad.current = false;
    }
  };

  useEffect(() => {
    // Initial load (with spinner)
    fetchBlogs(false);

    // Background polling (no flicker)
  }, []);

  const handleApprove = async (blogId) => {
    try {
      await api.post(`api/admin-approve/blogs/${blogId}/approve/`);

      showSnackbar("Blog approved successfully.");
      setBlogs((prev) => {
        const updated = prev.filter((b) => b.id !== blogId);

        // 🔑 update count immediately
        onCountChange?.(updated.length);

        return updated;
      });
    } catch (err) {
      console.error("Failed to approve blog:", err);
      showSnackbar(err?.response?.data?.detail || "Unable to approve blog.");
    }
  };

  return (\n    <>\n      {snackbar.open && (\n        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">\n          {snackbar.message}\n          <button type="button" onClick={() => setSnackbar((prev) => ({ ...prev, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button>\n        </div>\n      )}\n\n      {loading)
    return <div className="p-6 text-center">Loading blogs...</div>;

  if (blogs.length === 0)
    return <><div className="p-6 text-center">No pending blogs.</div></>;

  return (
    <div className="max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Pending Blog Approvals</h1>

      <div className="space-y-4">
        {blogs.map((blog) => (
          <div
            key={blog.id}
            className="border rounded p-4 bg-white shadow"
          >
            <h2 className="text-xl font-semibold">{blog.title}</h2>

            <p className="text-gray-700 mb-2">
              {blog.content.slice(0, 150)}...
            </p>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">
                By: {blog.user_name}
              </span>

              <button
                onClick={() => handleApprove(blog.id)}
                className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700"
              >
                Approve
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>\n    </>\n  );\n}
