import { useEffect, useMemo, useState } from "react";
import DOMPurify from "dompurify";
import RichTextEditor from "../RichTextEditor/RichTextEdit";
import api, { getWebSocketUrl } from "../../Services/Api";

const safeHtml = (value) =>
  DOMPurify.sanitize(value || "No answer yet.", {
    USE_PROFILES: { html: true },
  });

const FAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editedAnswer, setEditedAnswer] = useState("");
  const [newFaq, setNewFaq] = useState({ question: "", answer: "", category: "" });
  const [saving, setSaving] = useState(false);
  const [faqCandidates, setFaqCandidates] = useState([]);

  const fetchFaqs = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await api.get("/api/faqs/", { withCredentials: true });
      const data = response.data;
      setFaqs(Array.isArray(data) ? data : data?.results || []);
    } catch (error) {
      console.error("Failed to fetch FAQs:", error);
      if (!silent) setFaqs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchFaqs(false);
    api.get("/api/support/faq-candidates/", { withCredentials: true })
      .then((response) => setFaqCandidates(Array.isArray(response.data) ? response.data : []))
      .catch(() => setFaqCandidates([]));
  }, []);

  useEffect(() => {
    let socket;
    let timer;
    let attempts = 0;
    let closed = false;

    const connect = () => {
      if (closed) return;
      socket = new WebSocket(getWebSocketUrl("/ws/faq/"));
      socket.onopen = () => { attempts = 0; };
      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "faq.changed") fetchFaqs(true);
        } catch {
          // Ignore malformed realtime frames.
        }
      };
      socket.onclose = () => {
        if (closed) return;
        timer = window.setTimeout(connect, Math.min(1000 * 2 ** attempts++, 15000));
      };
      socket.onerror = () => socket.close();
    };

    connect();
    return () => {
      closed = true;
      if (timer) window.clearTimeout(timer);
      if (socket) socket.close();
    };
  }, []);

  const handleCreate = async () => {
    if (!newFaq.question.trim()) return;
    setSaving(true);
    try {
      const response = await api.post("/api/faqs/", newFaq, { withCredentials: true });
      setFaqs((current) => [response.data, ...current]);
      setNewFaq({ question: "", answer: "", category: "" });
    } catch (error) {
      console.error("Failed to create FAQ:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async (id) => {
    setSaving(true);
    try {
      const response = await api.patch(
        `/api/faqs/${id}/`,
        { answer: editedAnswer },
        { withCredentials: true }
      );
      setFaqs((current) => current.map((faq) => faq.id === id ? response.data : faq));
      setEditingId(null);
      setEditedAnswer("");
    } catch (error) {
      console.error("Failed to update FAQ:", error);
    } finally {
      setSaving(false);
    }
  };

  const filteredFaqs = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return faqs;
    return faqs.filter((faq) =>
      [faq.question, faq.answer, faq.category]
        .some((value) => String(value || "").toLowerCase().includes(query))
    );
  }, [faqs, search]);

  const groupedFaqs = useMemo(() => filteredFaqs.reduce((groups, faq) => {
    const category = faq.category || "General";
    (groups[category] ||= []).push(faq);
    return groups;
  }, {}), [filteredFaqs]);

  return (
    <div className="min-h-full bg-background p-2 text-foreground sm:p-4 lg:p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-2xl border border-border bg-card p-5 shadow-custom sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Content</p>
          <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">Frequently Asked Questions</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage the customer knowledge base with secure rich-text answers.</p>
        </header>

        <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <h2 className="text-base font-bold text-card-foreground">Create FAQ</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="min-w-0">
              <label className="mb-2 block text-xs font-semibold text-muted-foreground">Question</label>
              <input
                value={newFaq.question}
                onChange={(e) => setNewFaq({ ...newFaq, question: e.target.value })}
                placeholder="Type the customer question"
                className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-transparent px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
              />
              {faqCandidates.length > 0 && (
                <select
                  value=""
                  onChange={(e) => {
                    const candidate = faqCandidates.find((item) => String(item.question) === e.target.value);
                    if (candidate) {
                      setNewFaq((current) => ({
                        ...current,
                        question: candidate.question,
                        category: current.category || candidate.category || "",
                      }));
                    }
                  }}
                  className="mt-2 min-h-10 w-full min-w-0 rounded-xl border border-border bg-card px-3 text-xs text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
                  aria-label="Repeated support questions"
                >
                  <option value="">Use a repeated support question (3+ requests)</option>
                  {faqCandidates.map((candidate) => (
                    <option key={candidate.question} value={candidate.question}>
                      {candidate.question} — {candidate.question_count} requests
                    </option>
                  ))}
                </select>
              )}
            </div>
            <input
              value={newFaq.category}
              onChange={(e) => setNewFaq({ ...newFaq, category: e.target.value })}
              placeholder="Category"
              className="min-h-11 w-full min-w-0 rounded-xl border border-border bg-transparent px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div className="mt-3">
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Answer</p>
            <RichTextEditor
              value={newFaq.answer}
              onChange={(value) => setNewFaq({ ...newFaq, answer: value })}
            />
          </div>
          <button
            type="button"
            disabled={saving}
            onClick={handleCreate}
            className="mt-3 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {saving ? "Saving..." : "Add FAQ"}
          </button>
        </section>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search FAQs..."
          className="mb-5 min-h-11 w-full rounded-xl border border-border bg-transparent px-4 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-primary/20"
        />

        {loading ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading FAQs...</div>
        ) : Object.keys(groupedFaqs).length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">No FAQs found.</div>
        ) : (
          Object.entries(groupedFaqs).map(([category, items]) => (
            <section key={category} className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-base font-bold text-card-foreground">{category}</h2>
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{items.length}</span>
              </div>
              <div className="grid gap-3">
                {items.map((faq) => (
                  <article key={faq.id} className="rounded-2xl border border-border bg-card p-4 shadow-sm">
                    <h3 className="break-words text-sm font-bold text-card-foreground sm:text-base">{faq.question}</h3>
                    {editingId === faq.id ? (
                      <div className="mt-3">
                        <RichTextEditor value={editedAnswer} onChange={setEditedAnswer} />
                        <div className="mt-3 flex flex-wrap gap-2">
                          <button type="button" disabled={saving} onClick={() => handleSave(faq.id)} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                            {saving ? "Saving..." : "Save"}
                          </button>
                          <button type="button" disabled={saving} onClick={() => { setEditingId(null); setEditedAnswer(""); }} className="rounded-xl border border-border px-4 py-2 text-sm font-semibold text-card-foreground">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div
                          className="min-w-0 flex-1 text-sm leading-6 text-muted-foreground [&_a]:underline [&_h1]:font-bold [&_h2]:font-bold [&_h3]:font-bold [&_li]:ml-5 [&_ol]:list-decimal [&_p]:mb-2 [&_ul]:list-disc"
                          dangerouslySetInnerHTML={{ __html: safeHtml(faq.answer) }}
                        />
                        <button
                          type="button"
                          onClick={() => { setEditingId(faq.id); setEditedAnswer(faq.answer || ""); }}
                          className="shrink-0 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-card-foreground hover:bg-muted"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default FAQ;
