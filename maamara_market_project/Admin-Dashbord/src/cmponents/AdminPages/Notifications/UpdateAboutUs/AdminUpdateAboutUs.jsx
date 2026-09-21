import { useEffect, useState } from "react";
import { IonIcon } from "@ionic/react";
import { closeOutline } from "ionicons/icons";
import api from "../../../../Services/Api";
import RichTextEditor from "../../../../cmponents/RichTextEditor/RichTextEdit";

const emptyForm = {
  hero_image: null,
  hero_title: "",
  hero_subtitle: "",
  about_title: "",
  impact_title: "",
  impact_content: "",
  products_title: "",
  products_content: "",
  materials_content: "",
};

const AboutAdminPanel = ({ open, onClose }) => {
  const [form, setForm] = useState(emptyForm);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const fetchAbout = async () => {
    try {
      setLoading(true);
      const response = await api.get("/api/admin-about/");
      const data = response.data || {};
      setForm({
        ...emptyForm,
        hero_title: data.hero_title || "",
        hero_subtitle: data.hero_subtitle || "",
        about_title: data.about_title || "",
        impact_title: data.impact_title || "",
        impact_content: data.impact_content || "",
        products_title: data.products_title || "",
        products_content: data.products_content || "",
        materials_content: data.materials_content || "",
      });
      setPreview(typeof data.hero_image === "string" ? data.hero_image : null);
    } catch (error) {
      console.error("About page load failed:", error);
      setMessage("Failed to load About page.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) fetchAbout();
  }, [open]);

  const updateField = (name, value) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleImage = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setMessage("Only JPG, PNG and WEBP images are allowed.");
      return;
    }
    updateField("hero_image", file);
    setPreview(URL.createObjectURL(file));
  };

  const save = async () => {
    try {
      setSaving(true);
      setMessage("");
      const formData = new FormData();
      Object.entries(form).forEach(([key, value]) => {
        if (value !== null && value !== undefined) formData.append(key, value);
      });
      await api.post("/api/admin-about/", formData);
      setMessage("About page updated successfully.");
      await fetchAbout();
    } catch (error) {
      console.error("About page save failed:", error);
      setMessage("Failed to save About page.");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 top-14 z-[80] flex justify-end bg-background/80 backdrop-blur-sm sm:top-16" onMouseDown={onClose}>
      <section
        className="flex h-full w-full max-w-4xl flex-col border-l border-border bg-background shadow-2xl"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <header className="flex min-h-[72px] shrink-0 items-center justify-between border-b border-border bg-card px-4 sm:px-6">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Content management</p>
            <h2 className="text-lg font-bold text-card-foreground">About Maa Mara</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-xl p-2 text-muted-foreground hover:bg-muted">
            <IonIcon icon={closeOutline} className="text-xl" />
          </button>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
          {message && (
            <div className="mb-4 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-foreground">
              {message}
            </div>
          )}

          {loading ? (
            <div className="py-10 text-center text-sm text-slate-400">Loading About page…</div>
          ) : (
            <div className="mx-auto max-w-3xl space-y-6">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Hero image</label>
                {preview && <img src={preview} alt="About hero preview" className="mt-2 h-48 w-full rounded-2xl object-cover" />}
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImage} className="mt-3 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:font-semibold file:text-indigo-700 dark:file:bg-indigo-500/15 dark:file:text-indigo-300" />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  ["hero_title", "Hero title"],
                  ["hero_subtitle", "Hero subtitle"],
                  ["about_title", "About title"],
                  ["impact_title", "Impact title"],
                  ["products_title", "Products title"],
                ].map(([name, label]) => (
                  <label key={name} className="grid gap-1.5 text-xs font-semibold text-muted-foreground">
                    {label}
                    <input
                      name={name}
                      value={form[name]}
                      placeholder={placeholder}
                      onChange={(event) => updateField(name, event.target.value)}
                      className="h-11 rounded-[20px] border border-border bg-background px-4 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </label>
                ))}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-card-foreground">Impact content</p>
                <RichTextEditor placeholder="Describe Maa Mara’s impact, community value, and what makes the marketplace meaningful." value={form.impact_content} onChange={(value) => updateField("impact_content", value)} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Products content</p>
                <RichTextEditor placeholder="Explain the products, categories, or marketplace experience customers can expect." value={form.products_content} onChange={(value) => updateField("products_content", value)} />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-900 dark:text-white">Materials content</p>
                <RichTextEditor placeholder="Describe materials, sourcing, quality standards, or other information customers should know." value={form.materials_content} onChange={(value) => updateField("materials_content", value)} />
              </div>

              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="w-full rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save About page"}
              </button>
            </div>
          )}
        </main>
      </section>
    </div>
  );
};

export default AboutAdminPanel;
