import { useEffect, useMemo, useState } from "react";
import { sanitizeRichText } from "../../../../../utils/sanitizeRichText";
import { IonIcon } from "@ionic/react";
import { chevronDownOutline, searchOutline } from "ionicons/icons";
import api from "../../../../../Services/Api";

const CustomerFAQ = () => {
  const [faqs, setFaqs] = useState([]);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [openId, setOpenId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get("/api/faqs/")
      .then(({ data }) => {
        if (active) setFaqs(Array.isArray(data) ? data : []);
      })
      .catch(() => {
        if (active) setError("We couldn't load the FAQs right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, []);

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(faqs.map((faq) => faq.category).filter(Boolean)))],
    [faqs]
  );

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    return faqs.filter((faq) => {
      const matchesCategory = category === "All" || faq.category === category;
      const matchesSearch =
        !term ||
        faq.question?.toLowerCase().includes(term) ||
        faq.category?.toLowerCase().includes(term) ||
        faq.answer?.toLowerCase().includes(term);
      return matchesCategory && matchesSearch;
    });
  }, [faqs, query, category]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="mb-2 text-sm font-medium text-muted-foreground">Help &amp; Support</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Frequently Asked Questions
        </h1>
        <p className="mt-3 max-w-2xl text-muted-foreground">
          Find answers about shopping, orders, payments, returns, accounts, and the Maa Mara Market.
        </p>
      </header>

      <div className="mb-6 flex flex-col gap-3">
        <label className="relative block">
          <span className="sr-only">Search FAQs</span>
          <IonIcon icon={searchOutline} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search frequently asked questions"
            className="h-11 w-full rounded-xl border border-border bg-transparent pl-11 pr-4 text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/20"
          />
        </label>

        {categories.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-colors ${category === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-transparent text-foreground hover:bg-muted"}`}
              >
                {item}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">Loading FAQs…</div>
      ) : error ? (
        <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-border p-8 text-center text-muted-foreground">
          No FAQs match your search.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border">
          {filtered.map((faq) => {
            const isOpen = openId === faq.id;
            return (
              <section key={faq.id} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpenId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left sm:px-6"
                >
                  <span className="min-w-0">
                    {faq.category && <span className="mb-1 block text-xs font-medium text-muted-foreground">{faq.category}</span>}
                    <span className="block font-medium text-foreground">{faq.question}</span>
                  </span>
                  <IonIcon icon={chevronDownOutline} className={`shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && (
                  <div
                    className="max-w-none border-t border-border px-4 py-5 text-sm leading-6 text-foreground sm:px-6 [&_h1]:mb-3 [&_h1]:text-2xl [&_h1]:font-bold [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_p]:mb-3 [&_p]:leading-7 [&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#2563eb] [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-[#2563eb] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(faq.answer || "") }}
                  />
                )}
              </section>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default CustomerFAQ;
