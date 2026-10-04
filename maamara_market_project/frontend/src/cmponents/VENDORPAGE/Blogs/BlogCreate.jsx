import React, { useState } from "react";
import api from "../../../Services/Api";
import RichTextEditor from "../../RichTextEditor/RichTextEdit";

const inputClass =
  "w-full rounded-[20px] border border-gray-300 bg-white px-4 py-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/10";

const labelClass = "mb-2 block text-xs font-semibold text-gray-700";

const BlogCreate = ({ items = [] }) => {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [item, setItem] = useState("");
  const [image, setImage] = useState(null);
  const [video, setVideo] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const resetForm = () => {
    setTitle("");
    setContent("");
    setItem("");
    setImage(null);
    setVideo(null);

    const imageInput = document.getElementById("blog-image");
    const videoInput = document.getElementById("blog-video");
    if (imageInput) imageInput.value = "";
    if (videoInput) videoInput.value = "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");

    if (!title.trim()) {
      setError("Please enter a blog title.");
      return;
    }

    if (!content.trim()) {
      setError("Please enter blog content.");
      return;
    }

    try {
      setSubmitting(true);

      const formData = new FormData();
      formData.append("title", title.trim());
      formData.append("content", content);

      if (item) {
        formData.append("item", item);
      }

      if (image) {
        formData.append("image", image);
      }

      if (video) {
        formData.append("video", video);
      }

      await api.post("/api/vendor/blogs/", formData, {
        withCredentials: true,
      });

      setMessage("Blog created successfully and submitted for approval.");
      resetForm();
    } catch (err) {
      console.error("Create blog failed:", err);

      const data = err?.response?.data;
      const detail =
        data?.detail ||
        data?.title?.[0] ||
        data?.content?.[0] ||
        "Unable to create the blog. Please try again.";

      setError(detail);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <div className="rounded-2xl border border-[#e6e6e4] bg-white p-4 sm:p-6">
        <div className="mb-6 border-b border-[#e6e6e4] pb-4">
          <p className="mb-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#2563eb]">
            Blog
          </p>
          <h2 className="text-2xl font-bold text-gray-900">
            Create New Blog
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            Write and submit a new blog post for review.
          </p>
        </div>

        {message && (
          <div className="mb-5 rounded-2xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="w-full max-w-2xl space-y-5">
          <div>
            <label htmlFor="blog-title" className={labelClass}>
              Blog Title
            </label>
            <input
              id="blog-title"
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Enter your blog title"
              className={inputClass}
              disabled={submitting}
            />
          </div>

          <div>
            <label className={labelClass}>Blog Content</label>
            <div className="overflow-hidden rounded-[20px] border border-gray-300 bg-white focus-within:border-[#2563eb] focus-within:ring-2 focus-within:ring-[#2563eb]/10">
              <RichTextEditor value={content} onChange={setContent} />
            </div>
          </div>

          <div>
            <label htmlFor="blog-item" className={labelClass}>
              Related Item <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <select
              id="blog-item"
              value={item}
              onChange={(event) => setItem(event.target.value)}
              className={inputClass}
              disabled={submitting}
            >
              <option value="">No related item</option>
              {Array.isArray(items) &&
                items.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label htmlFor="blog-image" className={labelClass}>
              Blog Image <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="blog-image"
              type="file"
              accept="image/*"
              onChange={(event) => setImage(event.target.files?.[0] || null)}
              className={inputClass}
              disabled={submitting}
            />
          </div>

          <div>
            <label htmlFor="blog-video" className={labelClass}>
              Blog Video <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              id="blog-video"
              type="file"
              accept="video/*"
              onChange={(event) => setVideo(event.target.files?.[0] || null)}
              className={inputClass}
              disabled={submitting}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-[#2563eb] px-5 py-3 text-sm font-semibold text-white transition duration-200 hover:bg-[#1d4ed8] focus:outline-none focus:ring-2 focus:ring-[#2563eb]/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting ? "Creating Blog..." : "Create Blog"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default BlogCreate;
