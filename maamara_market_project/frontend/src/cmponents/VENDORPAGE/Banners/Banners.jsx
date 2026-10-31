import React, { useEffect, useState } from "react";
import NativeAwareSelect from "../../../components/NativeAwareSelect";
import api from "../../../Services/Api";
import { CircularProgress } from "@mui/material";
import AppSnackbar from "../../../../components/ui/app-snackbar";

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

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

const DURATION_OPTIONS = [
  { value: "7", label: "1 week" },
  { value: "14", label: "2 weeks" },
  { value: "30", label: "1 month" },
  { value: "90", label: "3 months" },
  { value: "180", label: "6 months" },
  { value: "365", label: "1 year" },
  { value: "custom", label: "Pick an end date" },
];

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const SELECT_CLASS = "w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20";

const daysInMonth = (year, monthIndex) => new Date(year, monthIndex + 1, 0).getDate();

const BannerAdd = ({ items = [], onSave = () => {} }) => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("");
  const [image, setImage] = useState(null);

  const [ctaType, setCtaType] = useState("item");
  const [ctaItem, setCtaItem] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const today = new Date();
  const [duration, setDuration] = useState("30");
  const [endYear, setEndYear] = useState(String(today.getFullYear()));
  const [endMonth, setEndMonth] = useState(String(today.getMonth()));
  const [endDay, setEndDay] = useState(String(today.getDate()));

  const yearOptions = [today.getFullYear(), today.getFullYear() + 1].map((y) => ({ value: String(y), label: String(y) }));
  const dayCount = daysInMonth(Number(endYear), Number(endMonth));
  const dayOptions = Array.from({ length: dayCount }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }));
  const customEnd = new Date(Number(endYear), Number(endMonth), Math.min(Number(endDay), dayCount), 23, 59, 0);
  const endPreview = duration === "custom"
    ? customEnd
    : new Date(Date.now() + Number(duration) * 24 * 60 * 60 * 1000);

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

  const handleImageChange = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) {
      setImage(null);
      return;
    }
    if (!file.type.startsWith("image/")) {
      setSnackbar({ open: true, message: "Please select an image file.", severity: "error" });
      event.target.value = "";
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setSnackbar({ open: true, message: "Banner images must be 10 MB or smaller.", severity: "error" });
      event.target.value = "";
      return;
    }
    setImage(file);
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

    if (image instanceof File && (!image.type.startsWith("image/") || image.size > MAX_IMAGE_BYTES)) {
      setSnackbar({
        open: true,
        message: image.size > MAX_IMAGE_BYTES ? "Banner images must be 10 MB or smaller." : "Please select an image file.",
        severity: "error",
      });
      return;
    }

    if (!(image instanceof File) && !backgroundColor) {
      setSnackbar({
        open: true,
        message: "Please upload a banner image or choose a banner colour.",
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

    if (duration === "custom") {
      const maxEnd = Date.now() + 365 * 24 * 60 * 60 * 1000;
      if (customEnd.getTime() <= Date.now()) {
        setSnackbar({ open: true, message: "Choose an end date in the future.", severity: "error" });
        return;
      }
      if (customEnd.getTime() > maxEnd) {
        setSnackbar({ open: true, message: "A banner can run for at most one year.", severity: "error" });
        return;
      }
    }

    setSubmitting(true);

    const formData = new FormData();
    formData.append("title", title.trim());
    formData.append("subtitle", subtitle.trim());
    formData.append("background_color", backgroundColor);
    formData.append("cta_type", ctaType);
    formData.append("cta_item", ctaType === "item" ? ctaItem : "");
    formData.append("cta_url", ctaType === "external" ? ctaUrl.trim() : "");
    if (duration === "custom") {
      formData.append("end_date", customEnd.toISOString());
    } else {
      formData.append("duration_days", duration);
    }

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
        setBackgroundColor("");
        setImage(null);
        setCtaType("item");
        setCtaItem(items.length > 0 ? String(items[0].id) : "");
        setCtaUrl("");
        setDuration("30");
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
            <button
              type="button"
              onClick={() => setBackgroundColor("")}
              aria-pressed={!backgroundColor}
              className={`flex items-center gap-2 rounded-[20px] border px-3 py-2.5 text-left text-xs font-semibold transition ${
                !backgroundColor
                  ? "border-gray-900 ring-2 ring-gray-200"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <span className="h-7 w-7 shrink-0 rounded-full border border-dashed border-gray-400 bg-white" />
              <span className="truncate text-card-foreground">No background</span>
            </button>
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
          <NativeAwareSelect
              value={ctaType}
              onChange={(e) => setCtaType(e.target.value)}
              options={[
                { value: "item", label: "Product" },
                { value: "external", label: "External Link" },
              ]}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
        </div>

        {ctaType === "item" && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
              Select product
            </label>
            <NativeAwareSelect
              value={ctaItem}
              onChange={(e) => setCtaItem(e.target.value)}
              placeholder="Select product"
              options={[
                { value: "", label: "Select product" },
                ...items.map((item) => ({ value: String(item.id), label: item.name })),
              ]}
              className="w-full rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
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
            How long should the banner run?
          </label>
          <NativeAwareSelect
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
            options={DURATION_OPTIONS}
            className={SELECT_CLASS}
          />
          {duration === "custom" && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              <NativeAwareSelect value={endDay} onChange={(e) => setEndDay(e.target.value)} options={dayOptions} className={SELECT_CLASS} aria-label="End day" />
              <NativeAwareSelect value={endMonth} onChange={(e) => setEndMonth(e.target.value)} options={MONTHS.map((m, i) => ({ value: String(i), label: m }))} className={SELECT_CLASS} aria-label="End month" />
              <NativeAwareSelect value={endYear} onChange={(e) => setEndYear(e.target.value)} options={yearOptions} className={SELECT_CLASS} aria-label="End year" />
            </div>
          )}
          <p className="mt-1 text-xs text-muted-foreground">
            Runs after admin approval and is removed automatically on{" "}
            {endPreview.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-card-foreground">
            Banner image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            required
            className="block w-full rounded-[20px] border border-gray-300 bg-background px-4 py-3 text-sm text-foreground file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-xs file:font-semibold file:text-primary-foreground"
          />
          <p className="mt-1 text-xs text-muted-foreground">Image size limit: 10 MB.</p>
          {image instanceof File && (
            <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
              <span className="min-w-0 break-all text-xs text-gray-700">{image.name} · {(image.size / (1024 * 1024)).toFixed(2)} MB</span>
              <button type="button" onClick={() => { setImage(null); const input = document.querySelector('input[type="file"][accept="image/*"]'); if (input) input.value = ""; }} className="shrink-0 rounded-full border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-100">Remove</button>
            </div>
          )}
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

      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={handleCloseSnackbar} />
    </div>
  );
};

export default BannerAdd;
