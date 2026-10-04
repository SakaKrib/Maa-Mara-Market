import React, { useEffect, useState } from "react";
import api from "../../../Services/Api";
import { CircularProgress } from "@mui/material";

const BANNER_COLORS = [
  { name: "Warm Ivory", value: "#f5f4f1", swatch: "bg-[#f5f4f1]" },
  { name: "Soft Blue", value: "#eef3f8", swatch: "bg-[#eef3f8]" },
  { name: "Sage", value: "#edf4ea", swatch: "bg-[#edf4ea]" },
  { name: "Sand", value: "#f6efe7", swatch: "bg-[#f6efe7]" },
  { name: "Blush", value: "#f8eaea", swatch: "bg-[#f8eaea]" },
  { name: "Lavender", value: "#f3eef7", swatch: "bg-[#f3eef7]" },
  { name: "Soft Aqua", value: "#eaf4f4", swatch: "bg-[#eaf4f4]" },
  { name: "Stone", value: "#efefec", swatch: "bg-[#efefec]" },
];

const BannerAdd = ({ items = [], onSave = () => {} }) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState(BANNER_COLORS[0].value);
  const [image, setImage] = useState(null);

  const [ctaType, setCtaType] = useState("item");
  const [ctaItem, setCtaItem] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  useEffect(() => {
    if (items.length > 0 && !ctaItem) {
      setCtaItem(String(items[0].id));
    }
  }, [items, ctaItem]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) {
      setSnackbar({
        open: true,
        message: "Please enter a banner title.",
        severity: "error",
      });
      return;
    }

    if (ctaType === "item" && !ctaItem) {
      setSnackbar({
        open: true,
        message: "Please select a product.",
        severity: "error",
      });
      return;
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subtitle", subtitle.trim());
    formData.append("background_color", backgroundColor);
    formData.append("cta_type", ctaType);
    formData.append("cta_item", ctaType === "item" ? ctaItem : "");
    formData.append("cta_url", ctaType === "external" ? ctaUrl.trim() : "");

    if (image instanceof File) {
      formData.append("image", image);
    }

    try {
      const response = await api.post("/api/vendor/banners/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.status === 201) {
        setSnackbar({
          open: true,
          message: "Banner created successfully.",
          severity: "success",
        });

        setTitle("");
        setSubtitle("");
        setBackgroundColor(BANNER_COLORS[0].value);
        setImage(null);
        setCtaType("item");
        setCtaItem(items.length > 0 ? String(items[0].id) : "");
        setCtaUrl("");
        onSave(response.data);
      }
    } catch (error) {
      console.error(error);
      setSnackbar({
        open: true,
        message:
          error.response?.data?.detail ||
          "Failed to create banner.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="mx-auto w-full max-w-2xl space-y-5"
      >
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
            Banner title
          </label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Fresh products from local sellers"
            required
            className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
            Subtitle
          </label>
          <input
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
            placeholder="Short supporting message"
            className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold text-card-foreground">
            Banner color
          </label>
          <p className="mb-3 text-xs text-muted-foreground">
            Choose from the curated homepage palette. Custom colors are intentionally disabled.
          </p>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {BANNER_COLORS.map((color) => {
              const selected = backgroundColor === color.value;
              return (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setBackgroundColor(color.value)}
                  aria-pressed={selected}
                  className={`flex items-center gap-2 rounded-[20px] border px-3 py-2.5 text-left text-xs font-semibold transition ${
                    selected
                      ? "border-gray-900 ring-2 ring-gray-200"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  <span
                    className={`h-7 w-7 shrink-0 rounded-full border border-gray-300 ${color.swatch}`}
                  />
                  <span className="truncate text-card-foreground">{color.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
            Call to action
          </label>
          <select
            value={ctaType}
            onChange={(e) => setCtaType(e.target.value)}
            className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
          >
            <option value="item">Product</option>
            <option value="external">External Link</option>
          </select>
        </div>

        {ctaType === "item" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              Select product
            </label>
            <select
              value={ctaItem}
              onChange={(e) => setCtaItem(e.target.value)}
              className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Select product</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {ctaType === "external" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              External link
            </label>
            <input
              type="url"
              value={ctaUrl}
              onChange={(e) => setCtaUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary"
            />
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
            Banner image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files?.[0] || null)}
            required
            className="block w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground"
          />
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-full bg-black px-5 py-3.5 text-center text-sm font-semibold text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? (
            <span className="inline-flex items-center justify-center gap-2">
              <CircularProgress size={18} sx={{ color: "#fff" }} />
              Creating...
            </span>
          ) : (
            "Create Banner"
          )}
        </button>
      </form>

      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.message}
          <button
            type="button"
            onClick={handleCloseSnackbar}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}
    </div>
  );
};

export default BannerAdd;
