import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, FileText, ShieldCheck } from "lucide-react";
import "./legal.css";
import { CONTACT_EMAIL, LEGAL_UPDATED, PRIVACY, TERMS } from "./legalContent";

const DOCS = {
  terms: { ...TERMS, path: "/terms", icon: FileText, otherLabel: "Privacy Policy", otherPath: "/privacy" },
  privacy: { ...PRIVACY, path: "/privacy", icon: ShieldCheck, otherLabel: "Terms & Conditions", otherPath: "/terms" },
};

const LegalPage = ({ kind = "terms" }) => {
  const doc = DOCS[kind] || DOCS.terms;
  const location = useLocation();
  const [activeId, setActiveId] = useState(doc.sections[0].id);
  const [tocOpen, setTocOpen] = useState(false);
  const Icon = doc.icon;

  useEffect(() => {
    window.scrollTo({ top: 0 });
    setActiveId(doc.sections[0].id);
    setTocOpen(false);
  }, [kind, location.pathname, doc.sections]);

  // Lets the contents sidebar stick (see legal.css).
  useEffect(() => {
    document.documentElement.classList.add("mm-legal-page");
    document.body.classList.add("mm-legal-page");
    return () => {
      document.documentElement.classList.remove("mm-legal-page");
      document.body.classList.remove("mm-legal-page");
    };
  }, []);

  // Highlight the section being read.
  useEffect(() => {
    const nodes = doc.sections.map((section) => document.getElementById(`legal-${section.id}`)).filter(Boolean);
    if (!nodes.length || typeof IntersectionObserver === "undefined") return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActiveId(visible[0].target.id.replace("legal-", ""));
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [doc]);

  const goTo = (id) => {
    document.getElementById(`legal-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    setTocOpen(false);
  };

  const toc = useMemo(
    () => (
      <ol className="space-y-0.5">
        {doc.sections.map((section) => (
          <li key={section.id}>
            <button
              type="button"
              onClick={() => goTo(section.id)}
              className={`w-full rounded-lg px-3 py-1.5 text-left text-[13px] leading-5 transition ${
                activeId === section.id ? "bg-primary/10 font-semibold text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {section.title}
            </button>
          </li>
        ))}
      </ol>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [doc, activeId]
  );

  return (
    <main className="mx-auto w-full max-w-6xl px-3 py-8 text-foreground sm:px-6 sm:py-12">
      <header className="rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <Icon size={14} aria-hidden="true" /> Legal
          </div>
          <nav aria-label="Legal documents" className="flex gap-2">
            {Object.entries(DOCS).map(([key, entry]) => (
              <Link
                key={key}
                to={entry.path}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  key === kind ? "border-foreground bg-foreground text-background" : "border-border text-foreground hover:bg-muted"
                }`}
              >
                {key === "terms" ? "Terms" : "Privacy"}
              </Link>
            ))}
          </nav>
        </div>
        <h1 className="mt-5 text-3xl font-bold tracking-tight text-card-foreground sm:text-4xl">{doc.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Last updated {LEGAL_UPDATED}</p>
        <p className="mt-4 max-w-3xl text-[15px] leading-7 text-muted-foreground">{doc.intro}</p>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border border-border bg-card lg:hidden">
            <button
              type="button"
              onClick={() => setTocOpen((open) => !open)}
              aria-expanded={tocOpen}
              className="flex w-full items-center justify-between px-4 py-3 text-sm font-semibold"
            >
              In this document
              <ChevronDown size={16} className={`transition ${tocOpen ? "rotate-180" : ""}`} />
            </button>
            {tocOpen && <div className="max-h-[50vh] overflow-y-auto border-t border-border p-2">{toc}</div>}
          </div>
          <div className="hidden max-h-[calc(100vh-8rem)] overflow-y-auto rounded-2xl border border-border bg-card p-3 lg:block">
            <p className="px-3 pb-2 pt-1 text-[11px] font-bold uppercase tracking-[0.14em] text-muted-foreground">In this document</p>
            {toc}
          </div>
        </aside>

        <article className="min-w-0 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-8">
          <div className="space-y-9">
            {doc.sections.map((section) => (
              <section key={section.id} id={`legal-${section.id}`} className="scroll-mt-24">
                <h2 className="text-xl font-bold tracking-tight text-card-foreground">{section.title}</h2>
                {section.paragraphs.map((text, index) => (
                  <p key={index} className="mt-3 text-[15px] leading-7 text-muted-foreground">{text}</p>
                ))}
                {section.list && (
                  <ul className="mt-3 list-disc space-y-2 pl-5 text-[15px] leading-7 text-muted-foreground marker:text-foreground/40">
                    {section.list.map((item, index) => <li key={index}>{item}</li>)}
                  </ul>
                )}
                {section.extra?.map((text, index) => (
                  <p key={index} className="mt-3 text-[15px] leading-7 text-muted-foreground">{text}</p>
                ))}
              </section>
            ))}
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm">
            <span className="text-muted-foreground">
              Questions? <a className="font-semibold text-primary hover:underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
            </span>
            <Link to={doc.otherPath} className="font-semibold text-primary hover:underline">Read the {doc.otherLabel} →</Link>
          </div>
        </article>
      </div>
    </main>
  );
};

export default LegalPage;
