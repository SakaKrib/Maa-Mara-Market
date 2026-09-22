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

    return () => {
      active = false;
    };
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
    <main className="min-h-screen bg-[#f8f8f6] px-4 py-8 text-gray-900 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <header className="mb-6 rounded-[20px] border border-[#e6e6e4] bg-white p-5 sm:mb-8 sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gray-500">
            Help &amp; Support
          </p>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl lg:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-gray-600 sm:text-base">
            Find answers about shopping, orders, payments, returns, accounts, and the Maa Mara Market.
          </p>
        </header>

        <section className="mb-6 rounded-[20px] border border-[#e6e6e4] bg-white p-4 sm:p-5">
          <label className="relative block">
            <span className="sr-only">Search FAQs</span>
            <IonIcon
              icon={searchOutline}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search frequently asked questions"
              className="h-11 w-full rounded-[20px] border border-gray-300 bg-white pl-11 pr-4 text-sm text-gray-900 outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/15"
            />
          </label>

          {categories.length > 1 && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setCategory(item)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
                    category === item
                      ? "border-[#2563eb] bg-[#2563eb] text-white hover:bg-[#1d4ed8]"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </section>

        {loading ? (
          <div className="rounded-[20px] border border-[#e6e6e4] bg-white p-10 text-center text-sm text-gray-500">
            Loading FAQs…
          </div>
        ) : error ? (
          <div className="rounded-[20px] border border-[#e6e6e4] bg-white p-10 text-center text-sm text-gray-500">
            {error}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-[20px] border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500">
            No FAQs match your search.
          </div>
        ) : (
          <section className="overflow-hidden rounded-[20px] border border-[#e6e6e4] bg-white">
            {filtered.map((faq) => {
              const isOpen = openId === faq.id;

              return (
                <article key={faq.id} className="border-b border-[#e6e6e4] last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenId(isOpen ? null : faq.id)}
                    className="flex min-h-[68px] w-full items-center justify-between gap-4 px-4 py-4 text-left transition-colors hover:bg-[#f8f8f6] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563eb] sm:px-6"
                  >
                    <span className="min-w-0">
                      {faq.category && (
                        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.12em] text-gray-500">
                          {faq.category}
                        </span>
                      )}
                      <span className="block break-words text-sm font-semibold leading-6 text-gray-900 sm:text-base">
                        {faq.question}
                      </span>
                    </span>
                    <IonIcon
                      icon={chevronDownOutline}
                      className={`shrink-0 text-gray-500 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#2563eb]" : ""
                      }`}
                    />
                  </button>

                  {isOpen && (
                    <div
                      className="border-t border-[#e6e6e4] bg-[#fcfcfb] px-4 py-5 text-sm leading-7 text-gray-700 sm:px-6 sm:py-6 [&_h1]:mb-4 [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-gray-900 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-gray-900 [&_h3]:mb-2 [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:text-gray-900 [&_p]:mb-3 [&_p]:leading-7 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-1 [&_blockquote]:my-4 [&_blockquote]:border-l-4 [&_blockquote]:border-[#2563eb] [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-gray-600 [&_a]:font-medium [&_a]:text-[#2563eb] [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_code]:rounded [&_code]:bg-gray-100 [&_code]:px-1.5 [&_code]:py-0.5"
                      dangerouslySetInnerHTML={{ __html: sanitizeRichText(faq.answer || "") }}
                    />
                  )}
                </article>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
};

export default CustomerFAQ;
