import { useEffect, useState } from "react";
import { CircularProgress } from "@mui/material";
import api from "../../../Services/Api";
import { Button } from "../../../../components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../../../components/ui/select";

const blank = { title: "", subject: "", preheader: "", campaign_type: "custom", body_text: "", body_html: "", hero_image_url: "", cta_label: "Shop now", cta_url: "" };
const dateLabel = (value) => value ? new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" }) : "—";

export default function EmailCampaignManager() {
  const [campaigns, setCampaigns] = useState([]);
  const [subscribers, setSubscribers] = useState([]);
  const [mode, setMode] = useState("campaigns");
  const [subscriberFilter, setSubscriberFilter] = useState("true");
  const [form, setForm] = useState(blank);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [report, setReport] = useState(null);

  const load = async () => {
    setLoading(true); setNotice("");
    try {
      const [c, s] = await Promise.all([
        api.get("/api/admin/email-campaigns/"),
        api.get(`/api/admin/newsletter/subscribers/?subscribed=${subscriberFilter}`),
      ]);
      setCampaigns(Array.isArray(c.data) ? c.data : []);
      setSubscribers(Array.isArray(s.data) ? s.data : []);
    } catch (e) {
      setNotice(e?.response?.data?.detail || "Could not load campaigns or subscribers. Check admin access and migrations.");
    } finally { setLoading(false); }
  };
  useEffect(() => { load(); }, [subscriberFilter]);

  const update = (key) => (e) => setForm((v) => ({ ...v, [key]: e.target.value }));
  const save = async (e) => {
    e.preventDefault(); setNotice("");
    try {
      if (editingId) await api.patch(`/api/admin/email-campaigns/${editingId}/`, form);
      else await api.post("/api/admin/email-campaigns/", form);
      setForm(blank); setEditingId(null); setNotice("Draft saved."); await load();
    } catch (err) { setNotice(err?.response?.data?.detail || "Could not save the draft."); }
  };
  const action = async (id, name, payload = {}) => {
    setNotice("");
    try {
      if (name === "preview") {
        const response = await api.post(`/api/admin/email-campaigns/${id}/actions/preview/`, payload, { responseType: "text" });
        const blob = new Blob([response.data], { type: "text/html" });
        const url = URL.createObjectURL(blob); window.open(url, "_blank", "noopener,noreferrer");
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
    setForm({ title: campaign.title || "", subject: campaign.subject || "", preheader: campaign.preheader || "", campaign_type: campaign.campaign_type || "custom", body_text: campaign.body_text || "", body_html: campaign.body_html || "", hero_image_url: campaign.hero_image_url || "", cta_label: campaign.cta_label || "Shop now", cta_url: campaign.cta_url || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return <section className="space-y-4">
    <div className="flex flex-wrap gap-2 border-b border-border pb-3">
      <Button className="rounded-[20px]" variant={mode === "campaigns" ? "default" : "outline"} onClick={() => setMode("campaigns")}>Campaigns</Button>
      <Button className="rounded-[20px]" variant={mode === "subscribers" ? "default" : "outline"} onClick={() => setMode("subscribers")}>Subscriber management</Button>
    </div>
    {notice && <div role="status" className="rounded-xl border border-border bg-muted/40 p-3 text-sm">{notice}</div>}
    {mode === "campaigns" ? <>
      <form onSubmit={save} className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div><h3 className="text-lg font-bold tracking-tight text-card-foreground">{editingId ? "Edit campaign draft" : "Create campaign draft"}</h3><p className="mt-1 text-sm text-muted-foreground">Save a draft, preview it, then submit and approve it before sending. Only opted-in subscribers receive marketing campaigns.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Campaign title<input required value={form.title} onChange={update("title")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="text-sm">Email subject<input required value={form.subject} onChange={update("subject")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="block text-sm">Campaign type<div className="mt-1"><Select value={form.campaign_type} onValueChange={(value) => setForm((v) => ({ ...v, campaign_type: value }))}><SelectTrigger className="h-11 rounded-[20px] border-border bg-background px-4"><SelectValue placeholder="Choose campaign type" /></SelectTrigger><SelectContent><SelectItem value="custom">Custom campaign</SelectItem><SelectItem value="banner">Banner promotion</SelectItem><SelectItem value="sale">Sale items</SelectItem><SelectItem value="new_arrivals">New arrivals</SelectItem></SelectContent></Select></div></label>
          <label className="text-sm">Preheader<input value={form.preheader} onChange={update("preheader")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="text-sm sm:col-span-2">Banner image URL (HTTPS)<input type="url" value={form.hero_image_url} onChange={update("hero_image_url")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="text-sm sm:col-span-2">Email body (HTML supported)<textarea rows={5} value={form.body_html} onChange={update("body_html")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" placeholder="<p>Your campaign message...</p>" /></label>
          <label className="text-sm sm:col-span-2">Plain-text fallback<textarea rows={3} value={form.body_text} onChange={update("body_text")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="text-sm">Button label<input value={form.cta_label} onChange={update("cta_label")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
          <label className="text-sm">Button destination URL<input type="url" value={form.cta_url} onChange={update("cta_url")} className="mt-1 w-full rounded-[20px] border border-border bg-background px-4 py-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15" /></label>
        </div>
        <div className="flex flex-wrap gap-2 [&_button]:rounded-[20px]"><Button type="submit" className="rounded-[20px]">{editingId ? "Update draft" : "Save draft"}</Button>{editingId && <Button type="button" variant="outline" onClick={() => { setEditingId(null); setForm(blank); }}>Cancel edit</Button>}</div>
      </form>
      {report && <div className="rounded-xl border border-border bg-muted/30 p-4"><div className="flex items-center justify-between gap-2"><h4 className="font-bold">{report.campaign?.title} report</h4><Button className="rounded-[20px]" variant="outline" onClick={() => setReport(null)}>Close</Button></div><div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">{Object.entries(report.recipients || {}).map(([key, value]) => <div key={key} className="rounded-lg bg-card p-3"><p className="text-xs capitalize text-muted-foreground">{key}</p><p className="text-xl font-bold">{value}</p></div>)}</div><p className="mt-3 text-xs text-muted-foreground">{report.delivery_note}</p></div>}
      {loading ? <div className="flex justify-center p-8"><CircularProgress size={22} /></div> : <div className="space-y-3">{campaigns.map((c) => <article key={c.id} className="rounded-2xl border border-border bg-card p-4"><div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><h4 className="font-bold text-card-foreground">{c.title}</h4><p className="mt-1 text-sm text-muted-foreground">{c.subject}</p><p className="mt-1 text-xs text-muted-foreground">Created {dateLabel(c.created_at)} · {c.recipient_count} recipients · {c.sent_count} submitted · {c.failed_count} failed</p></div><span className="w-fit rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold capitalize text-primary">{c.status.replaceAll("_", " ")}</span></div><div className="mt-3 flex flex-wrap gap-2">
        {c.status === "draft" && <><Button className="rounded-[20px]" variant="outline" onClick={() => edit(c)}>Edit</Button><Button className="rounded-[20px]" variant="outline" onClick={() => action(c.id, "submit")}>Submit for approval</Button></>}
        {["draft","pending_approval","approved","scheduled"].includes(c.status) && <Button className="rounded-[20px]" variant="outline" onClick={() => action(c.id, "preview")}>Preview</Button>}
        {c.status === "pending_approval" && <Button className="rounded-[20px]" onClick={() => action(c.id, "approve")}>Approve</Button>}
        {c.status === "approved" && <><Button className="rounded-[20px]" onClick={() => action(c.id, "send")}>Send now</Button><Button className="rounded-[20px]" variant="outline" onClick={() => action(c.id, "schedule")}>Schedule</Button></>}
        {c.status === "scheduled" && <><Button onClick={() => action(c.id, "send")}>Send now</Button><Button className="rounded-[20px]" variant="outline" onClick={() => action(c.id, "cancel")}>Cancel schedule</Button></>}
        {["sent","failed"].includes(c.status) && <Button className="rounded-[20px]" variant="outline" onClick={() => action(c.id, "report")}>View report</Button>}
        {["draft","pending_approval","approved","failed"].includes(c.status) && <Button variant="outline" onClick={() => action(c.id, "cancel")}>Cancel</Button>}
      </div></article>)}{campaigns.length === 0 && <p className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">No campaigns yet. Daily automation will prepare reviewable drafts when eligible promotions are found.</p>}</div>}
    </> : <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-sm"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card p-4 sm:p-5"><div><h3 className="text-lg font-bold tracking-tight text-card-foreground">Newsletter subscribers</h3><p className="mt-1 text-sm text-muted-foreground">Only active, consented subscribers receive campaigns. Unsubscribed contacts remain suppressed.</p></div><div className="w-full sm:w-64"><Select value={subscriberFilter} onValueChange={setSubscriberFilter}><SelectTrigger className="h-11 rounded-[20px] border-border bg-background px-4 text-sm"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="true">Active subscribers</SelectItem><SelectItem value="false">Unsubscribed / suppressed</SelectItem></SelectContent></Select></div></div><table className="w-full text-left text-sm"><thead className="bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="p-3">Email</th><th className="p-3">Name</th><th className="p-3">Consent source</th><th className="p-3">Consent date</th><th className="p-3">Status</th></tr></thead><tbody>{subscribers.map((s) => <tr key={s.id} className="border-t border-border"><td className="p-3 break-all">{s.email}</td><td className="p-3">{s.first_name || "—"}</td><td className="p-3">{s.consent_source}</td><td className="p-3">{dateLabel(s.consented_at)}</td><td className="p-3">{s.is_subscribed ? "Subscribed" : "Unsubscribed"}</td></tr>)}</tbody></table>{subscribers.length === 0 && <p className="p-6 text-center text-sm text-muted-foreground">No subscribers in this view yet.</p>}</div>}
  </section>;
}
