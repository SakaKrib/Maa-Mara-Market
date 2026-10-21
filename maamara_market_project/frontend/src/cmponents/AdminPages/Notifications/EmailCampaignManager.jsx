import { useEffect, useMemo, useState } from "react";
import { CircularProgress } from "@mui/material";
import { Image as ImageIcon, Search, Package, Megaphone, Check, Plus, X, Eye, CalendarClock, Send, FileText, Sparkles } from "lucide-react";
import api from "../../../Services/Api";
import { Button } from "../../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";

const blank = { title: "", subject: "", preheader: "", campaign_type: "custom", body_text: "", body_html: "", hero_image_url: "", cta_label: "Shop now", cta_url: "", content_payload: { items: [], banner: null } };
const dateLabel = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—";
const imageUrl = (value) => {
  if (!value) return "";
  try { return new URL(value, window.location.origin).toString(); } catch { return value; }
};
const itemImage = (item) => imageUrl(item?.image_url || item?.image);
const itemSnapshot = (item) => ({
  id: item.id,
  name: item.name || "Untitled item",
  price: item.price == null ? "" : String(item.price),
  discount_price: item.discount_price == null ? "" : String(item.discount_price),
  image_url: itemImage(item),
});

export default function EmailCampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [products, setProducts] = useState([]);
  const [banners, setBanners] = useState([]);
  const [mode, setMode] = useState("campaigns");
  const [subscriberFilter, setSubscriberFilter] = useState("true");
  const [form, setForm] = useState(blank);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectedBanner, setSelectedBanner] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [bannerSearch, setBannerSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [catalogNotice, setCatalogNotice] = useState("");
  const [report, setReport] = useState(null);

  const load = async () => {
    setLoading(true); setNotice("");
    try {
      const [c, s] = await Promise.all([
        api.get("/api/admin/email-campaigns/"),
        api.get(`/api/admin/newsletter/subscribers/?subscribed=${subscriberFilter}`),
      ]);
      setCampaigns(Array.isArray(c.data) ? c.data : (c.data?.results || []));
      setSubscribers(Array.isArray(s.data) ? s.data : (s.data?.results || []));
    } catch (e) {
      setNotice(e?.response?.data?.detail || "Could not load campaigns or subscribers. Check admin access and migrations.");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [subscriberFilter]);

  useEffect(() => {
    let active = true;
    const loadCatalog = async () => {
      setCatalogLoading(true); setCatalogNotice("");
      const results = await Promise.allSettled([
        api.get("/filter-products/?perPage=100"),
        api.get("/api/banners-list/"),
      ]);
      if (!active) return;
      const productResult = results[0];
      const bannerResult = results[1];
      if (productResult.status === "fulfilled") {
        const data = productResult.value.data;
        setProducts(Array.isArray(data) ? data : (data?.results || data?.data || []));
      } else {
        setProducts([]);
      }
      if (bannerResult.status === "fulfilled") {
        const data = bannerResult.value.data;
        setBanners((Array.isArray(data) ? data : (data?.results || data?.data || [])).filter((banner) => banner.is_approved !== false && banner.is_active !== false));
      } else {
        setBanners([]);
      }
      if (productResult.status === "rejected" || bannerResult.status === "rejected") {
        setCatalogNotice("Some existing content could not be loaded. Check admin access or try refreshing.");
      }
      setCatalogLoading(false);
    };
    loadCatalog();
    return () => { active = false; };
  }, []);

  const update = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));
  const visibleProducts = useMemo(() => {
    const query = productSearch.trim().toLowerCase();
    return products.filter((item) => !query || [item.name, item.description, item.brand?.name, item.category?.name].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [products, productSearch]);
  const visibleBanners = useMemo(() => {
    const query = bannerSearch.trim().toLowerCase();
    return banners.filter((banner) => !query || [banner.title, banner.subtitle].some((value) => String(value || "").toLowerCase().includes(query)));
  }, [banners, bannerSearch]);

  const chooseBanner = (banner) => {
    const isSelected = selectedBanner?.id === banner.id;
    const next = isSelected ? null : banner;
    setSelectedBanner(next);
    setForm((v) => ({
      ...v,
      hero_image_url: next ? imageUrl(next.image) : "",
      preheader: next?.subtitle || (isSelected ? "" : v.preheader),
      cta_url: next?.cta_url ? imageUrl(next.cta_url) : (next?.cta_item ? imageUrl(`/item/${next.cta_item}/`) : (isSelected ? "" : v.cta_url)),
      content_payload: { ...(v.content_payload || {}), banner: next ? { id: next.id, title: next.title, subtitle: next.subtitle || "", image_url: imageUrl(next.image) } : null },
    }));
  };

  const toggleProduct = (item) => {
    setSelectedProducts((previous) => {
      const exists = previous.some((selected) => String(selected.id) === String(item.id));
      return exists ? previous.filter((selected) => String(selected.id) !== String(item.id)) : [...previous, itemSnapshot(item)];
    });
  };

  const save = async (e) => {
    e.preventDefault(); setNotice("");
    const payload = {
      ...form,
      body_html: "",
      content_payload: {
        ...(form.content_payload || {}),
        banner: selectedBanner ? { id: selectedBanner.id, title: selectedBanner.title, subtitle: selectedBanner.subtitle || "", image_url: imageUrl(selectedBanner.image) } : null,
        items: selectedProducts.map(itemSnapshot),
      },
    };
    try {
      if (editingId) await api.patch(`/api/admin/email-campaigns/${editingId}/`, payload);
      else await api.post("/api/admin/email-campaigns/", payload);
      setForm(blank); setSelectedProducts([]); setSelectedBanner(null); setEditingId(null);
      setNotice("Draft saved. Preview it before submitting for approval.");
      await load();
    } catch (err) { setNotice(err?.response?.data?.detail || "Could not save the draft."); }
  };

  const action = async (id, name, payload = {}) => {
    setNotice("");
    try {
      if (name === "preview") {
        const response = await api.post(`/api/admin/email-campaigns/${id}/actions/preview/`, payload, { responseType: "text" });
        const blob = new Blob([response.data], { type: "text/html" });
        const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer");
        window.setTimeout(() => URL.revokeObjectURL(url), 60000);
        return;
      }
      if (name === "report") {
        const { data } = await api.get(`/api/admin/email-campaigns/${id}/report/`); setReport(data); return;
      }
      if (name === "schedule") {
        const value = window.prompt("Enter a future date and time with timezone, e.g. 2026-12-01T09:00:00+03:00");
        if (!value) return;
        await api.post(`/api/admin/email-campaigns/${id}/actions/schedule/`, { scheduled_at: value });
      } else if (name === "send" && !window.confirm("Send this approved campaign to all currently subscribed newsletter recipients?")) return;
      else await api.post(`/api/admin/email-campaigns/${id}/actions/${name}/`, payload);
      setNotice(name === "send" ? "Campaign queued for sending." : `Campaign ${name} successful.`);
      await load();
    } catch (err) { setNotice(err?.response?.data?.detail || `Campaign action failed: ${name}`); }
  };

  const edit = (campaign) => {
    setEditingId(campaign.id);
    setForm({
      ...blank,
      title: campaign.title || "",
      subject: campaign.subject || "",
      preheader: campaign.preheader || "",
      campaign_type: campaign.campaign_type || "custom",
      body_text: campaign.body_text || "",
      body_html: "",
      hero_image_url: campaign.hero_image_url || "",
      cta_label: campaign.cta_label || "Shop now",
      cta_url: campaign.cta_url || "",
      content_payload: campaign.content_payload || { items: [], banner: null },
    });
    setSelectedProducts(Array.isArray(campaign.content_payload?.items) ? campaign.content_payload.items : []);
    const bannerId = campaign.content_payload?.banner?.id;
    setSelectedBanner(banners.find((banner) => String(banner.id) === String(bannerId)) || (campaign.content_payload?.banner ? { ...campaign.content_payload.banner, image: campaign.content_payload.banner.image_url || "" } : null));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const resetDraft = () => {
    setEditingId(null); setForm(blank); setSelectedProducts([]); setSelectedBanner(null);
  };

  const fieldClass = "mt-1.5 block min-h-11 w-full rounded-[20px] border border-border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15";
  const sectionClass = "rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5";
  const buttonClass = "rounded-[20px]";

  return <section className="space-y-4 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)]">
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      <Button type="button" className={buttonClass} variant={mode === "campaigns" ? "default" : "outline"} onClick={() => setMode("campaigns")}>Campaigns</Button>
      <Button type="button" className={buttonClass} variant={mode === "subscribers" ? "default" : "outline"} onClick={() => setMode("subscribers")}>Subscriber management</Button>
    </div>
    {notice && <div role="status" className="rounded-xl border border-border bg-muted/40 p-3 text-sm">{notice}</div>}
    {mode === "campaigns" ? <>
      <form onSubmit={save} className="space-y-4">
        <section className={sectionClass}>
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></span>
            <div><h3 className="text-lg font-bold tracking-tight text-card-foreground">{editingId ? "Edit campaign draft" : "Create an email campaign"}</h3><p className="mt-1 text-sm text-muted-foreground">Choose existing marketplace content, write a short introduction, and preview the email before approval. Only opted-in subscribers receive marketing campaigns.</p></div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Campaign name <span className="text-destructive">*</span><input required value={form.title} onChange={update("title")} placeholder="e.g. Weekend market highlights" className={fieldClass} /></label>
            <label className="text-sm font-medium">Email subject <span className="text-destructive">*</span><input required value={form.subject} onChange={update("subject")} placeholder="What subscribers will see in their inbox" className={fieldClass} /></label>
            <label className="block text-sm font-medium">Campaign type<div className="mt-1.5"><Select value={form.campaign_type} onValueChange={(value) => setForm((v) => ({ ...v, campaign_type: value }))}><SelectTrigger className="h-11 rounded-[20px] border-border bg-background px-3.5 text-sm"><SelectValue placeholder="Choose campaign type" /></SelectTrigger><SelectContent><SelectItem value="custom">Custom campaign</SelectItem><SelectItem value="banner">Banner promotion</SelectItem><SelectItem value="sale">Sale items</SelectItem><SelectItem value="new_arrivals">New arrivals</SelectItem></SelectContent></Select></div></label>
            <label className="text-sm font-medium">Inbox preview text <span className="font-normal text-muted-foreground">(optional)</span><input value={form.preheader} onChange={update("preheader")} placeholder="A short line shown beside the subject" className={fieldClass} /></label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-3 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Megaphone className="h-5 w-5" /></span><div><h3 className="font-bold text-card-foreground">Choose an existing banner</h3><p className="mt-1 text-sm text-muted-foreground">Select an approved banner to use as the email's hero image. No image URL needs to be copied.</p></div></div>
          <div className="mb-3 flex flex-col gap-2 sm:flex-row">
            <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={bannerSearch} onChange={(e) => setBannerSearch(e.target.value)} placeholder="Search existing banners" aria-label="Search banners" className={fieldClass + " pl-9"} /></div>
            {selectedBanner && <Button type="button" variant="outline" className={buttonClass} onClick={() => chooseBanner(selectedBanner)}><X className="mr-1.5 h-4 w-4" />Remove banner</Button>}
          </div>
          {catalogLoading ? <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CircularProgress size={18} /> Loading banners…</div> : visibleBanners.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleBanners.map((banner) => {
            const selected = selectedBanner?.id === banner.id;
            return <button type="button" key={banner.id} onClick={() => chooseBanner(banner)} aria-pressed={selected} className={`group overflow-hidden rounded-xl border text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/50"}`}>
              <div className="relative aspect-[16/7] bg-muted">{banner.image ? <img src={imageUrl(banner.image)} alt={banner.title || "Banner"} className="h-full w-full object-cover" loading="lazy" /> : <div className="flex h-full items-center justify-center text-muted-foreground"><ImageIcon className="h-7 w-7" /></div>}<span className={`absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full ${selected ? "bg-primary text-primary-foreground" : "bg-background/90 text-foreground"}`}>{selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span></div>
              <div className="p-3"><p className="truncate text-sm font-semibold">{banner.title || "Untitled banner"}</p><p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{banner.subtitle || "Existing marketplace banner"}</p></div>
            </button>;
          })}</div> : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No approved banners found. You can continue without a banner.</p>}
          {catalogNotice && <p role="status" className="mt-3 text-xs text-amber-700 dark:text-amber-300">{catalogNotice}</p>}
        </section>

        <section className={sectionClass}>
          <div className="mb-3 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Package className="h-5 w-5" /></span><div><h3 className="font-bold text-card-foreground">Select products to feature</h3><p className="mt-1 text-sm text-muted-foreground">Choose existing items. Selected products are inserted into the email layout with their image and price.</p></div></div>
          <div className="relative mb-3"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={productSearch} onChange={(e) => setProductSearch(e.target.value)} placeholder="Search products by name or category" aria-label="Search products" className={fieldClass + " pl-9"} /></div>
          {selectedProducts.length > 0 && <div className="mb-4 rounded-xl bg-primary/5 p-3"><div className="mb-2 flex items-center justify-between gap-2"><p className="text-sm font-semibold">{selectedProducts.length} product{selectedProducts.length === 1 ? "" : "s"} selected</p><button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => setSelectedProducts([])}>Clear selection</button></div><div className="flex flex-wrap gap-2">{selectedProducts.map((item) => <span key={item.id} className="inline-flex max-w-full items-center gap-2 rounded-full border border-border bg-card py-1 pl-2 pr-1.5 text-xs"><span className="max-w-44 truncate">{item.name}</span><button type="button" aria-label={`Remove ${item.name}`} onClick={() => setSelectedProducts((prev) => prev.filter((entry) => String(entry.id) !== String(item.id)))} className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-muted"><X className="h-3.5 w-3.5" /></button></span>)}</div></div>}
          {catalogLoading ? <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground"><CircularProgress size={18} /> Loading products…</div> : visibleProducts.length ? <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{visibleProducts.map((item) => {
            const selected = selectedProducts.some((entry) => String(entry.id) === String(item.id));
            const image = itemImage(item);
            const price = item.discount_price && Number(item.discount_price) < Number(item.price) ? item.discount_price : item.price;
            return <button type="button" key={item.id} onClick={() => toggleProduct(item)} aria-pressed={selected} className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${selected ? "border-primary bg-primary/5 ring-1 ring-primary/20" : "border-border hover:border-primary/50 hover:bg-muted/30"}`}>
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-muted">{image ? <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" /> : <span className="flex h-full items-center justify-center text-muted-foreground"><Package className="h-6 w-6" /></span>}</span>
              <span className="min-w-0 flex-1"><span className="block line-clamp-2 text-sm font-semibold">{item.name || "Untitled item"}</span><span className="mt-1 block text-sm font-bold text-primary">{price != null ? `KSh ${Number(price).toLocaleString("en-KE")}` : "Price unavailable"}</span>{item.discount_price && Number(item.discount_price) < Number(item.price) && <span className="block text-xs text-muted-foreground line-through">KSh {Number(item.price).toLocaleString("en-KE")}</span>}</span>
              <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>{selected ? <Check className="h-4 w-4" /> : <Plus className="h-4 w-4" />}</span>
            </button>;
          })}</div> : <p className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">No available products found for that search.</p>}
        </section>

        <section className={sectionClass}>
          <div className="mb-3 flex items-start gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><FileText className="h-5 w-5" /></span><div><h3 className="font-bold text-card-foreground">Write your message</h3><p className="mt-1 text-sm text-muted-foreground">Write a normal message. The selected banner and products are placed into the email automatically—no HTML code required.</p></div></div>
          <label className="block text-sm font-medium">Introduction <span className="font-normal text-muted-foreground">(optional)</span><textarea rows={4} value={form.body_text} onChange={update("body_text")} placeholder="Tell subscribers what is special about this collection…" className={fieldClass + " min-h-28 resize-y leading-6"} /></label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-medium">Main button label<input value={form.cta_label} onChange={update("cta_label")} placeholder="Shop now" className={fieldClass} /></label>
            <label className="text-sm font-medium">Button destination <span className="font-normal text-muted-foreground">(optional)</span><input type="url" value={form.cta_url} onChange={update("cta_url")} placeholder="https://…" className={fieldClass} /></label>
          </div>
        </section>

        <section className={sectionClass}>
          <div className="mb-3 flex items-center gap-2"><Eye className="h-5 w-5 text-primary" /><h3 className="font-bold text-card-foreground">Email content preview</h3></div>
          <div className="mx-auto max-w-xl overflow-hidden rounded-xl border border-border bg-background shadow-sm">
            {form.hero_image_url && <img src={imageUrl(form.hero_image_url)} alt="Selected campaign banner" className="max-h-56 w-full object-cover" />}
            <div className="p-4 sm:p-6"><p className="text-xs text-muted-foreground">Subject: {form.subject || "Your email subject will appear here"}</p><h4 className="mt-2 text-xl font-bold">{form.title || "Your campaign title"}</h4>{form.preheader && <p className="mt-1 text-sm text-muted-foreground">{form.preheader}</p>}{form.body_text && <p className="mt-4 whitespace-pre-wrap text-sm leading-6">{form.body_text}</p>}
              {selectedProducts.length > 0 && <div className="mt-4 grid gap-3 sm:grid-cols-2">{selectedProducts.map((item) => <div key={item.id} className="overflow-hidden rounded-lg border border-border"><div className="aspect-[4/3] bg-muted">{item.image_url && <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />}</div><div className="p-3"><p className="line-clamp-2 text-sm font-semibold">{item.name}</p><p className="mt-1 text-sm font-bold text-primary">KSh {Number(item.discount_price && Number(item.discount_price) < Number(item.price) ? item.discount_price : item.price || 0).toLocaleString("en-KE")}</p></div></div>)}</div>}
              {form.cta_label && <div className="mt-5"><span className="inline-flex rounded-[20px] bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">{form.cta_label}</span></div>}
            </div>
          </div>
        </section>
        <div className="sticky bottom-0 z-10 -mx-1 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/95 px-1 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] backdrop-blur sm:static sm:mx-0 sm:px-0 sm:pb-0">
          <p className="hidden text-xs text-muted-foreground sm:block">Save as a draft first. Preview and submit it for approval when ready.</p>
          <div className="ml-auto flex w-full flex-col-reverse gap-2 sm:w-auto sm:flex-row">
            {editingId && <Button type="button" variant="outline" className={buttonClass} onClick={resetDraft}>Cancel edit</Button>}
            <Button type="submit" className={buttonClass}><Check className="mr-1.5 h-4 w-4" />{editingId ? "Update draft" : "Save draft"}</Button>
          </div>
        </div>
      </form>

      {report && <div className={sectionClass}><div className="flex items-center justify-between gap-2"><h4 className="font-bold">{report.campaign?.title} report</h4><Button type="button" className={buttonClass} variant="outline" onClick={() => setReport(null)}>Close</Button></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(report.recipients || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-muted p-3"><p className="text-xs capitalize text-muted-foreground">{key}</p><p className="text-xl font-bold">{value}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">{report.delivery_note}</p></div>}
      {loading ? <div className="flex justify-center p-8"><CircularProgress size={22} /></div> : <div className="space-y-3">{campaigns.map((c) => <article key={c.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h4 className="font-bold text-card-foreground">{c.title}</h4><p className="mt-1 text-sm text-muted-foreground">{c.subject}</p><p className="mt-1 text-xs text-muted-foreground">Created {dateLabel(c.created_at)} · {c.recipient_count} recipients · {c.sent_count} submitted · {c.failed_count} failed</p></div><span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{String(c.status || "").replaceAll("_", " ")}</span></div><div className="mt-3 flex flex-wrap gap-2">
        {c.status === "draft" && <><Button type="button" className={buttonClass} variant="outline" onClick={() => edit(c)}>Edit</Button><Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "submit")}>Submit for approval</Button></>}
        {["draft","pending_approval","approved","scheduled"].includes(c.status) && <Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "preview")}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>}
        {c.status === "pending_approval" && <Button type="button" className={buttonClass} onClick={() => action(c.id, "approve")}>Approve</Button>}
        {c.status === "approved" && <><Button type="button" className={buttonClass} onClick={() => action(c.id, "send")}><Send className="mr-1.5 h-4 w-4" />Send now</Button><Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "schedule")}><CalendarClock className="mr-1.5 h-4 w-4" />Schedule</Button></>}
        {c.status === "scheduled" && <><Button type="button" className={buttonClass} onClick={() => action(c.id, "send")}>Send now</Button><Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "cancel")}>Cancel schedule</Button></>}
        {["sent","failed"].includes(c.status) && <Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "report")}>View report</Button>}
        {["draft","pending_approval","approved","failed"].includes(c.status) && <Button type="button" className={buttonClass} variant="outline" onClick={() => action(c.id, "cancel")}>Cancel</Button>}
      </div></article>)}{campaigns.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No campaigns yet. Daily automation will prepare reviewable drafts when eligible promotions are found.</p>}</div>}
    </> : <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-4 sm:p-5"><div><h3 className="text-lg font-bold tracking-tight text-card-foreground">Newsletter subscribers</h3><p className="mt-1 text-sm text-muted-foreground">Only active, consented subscribers receive campaigns. Unsubscribed contacts remain suppressed.</p></div><div className="w-full sm:w-64"><Select value={subscriberFilter} onValueChange={setSubscriberFilter}><SelectTrigger className="h-11 rounded-[20px] border-border bg-background px-4 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active subscribers</SelectItem><SelectItem value="false">Unsubscribed / suppressed</SelectItem></SelectContent></Select></div></div><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Consent source</th><th className="p-3">Consent date</th><th className="p-3">Status</th></tr></thead><tbody>{subscribers.map((s) => <tr key={s.id} className="border-t border-border"><td className="p-3 break-all">{s.email}</td><td className="p-3">{s.first_name || "—"}</td><td className="p-3">{s.consent_source}</td><td className="p-3">{dateLabel(s.consented_at)}</td><td className="p-3">{s.is_subscribed ? "Subscribed" : "Unsubscribed"}</td></tr>)}</tbody></table>{subscribers.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No subscribers in this view yet.</p>}</div>}
  </section>;
}
