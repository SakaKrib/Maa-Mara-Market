import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, BadgeCheck, Ban, Banknote, Check, Clock, FileText, Lock, PackageCheck,
  RotateCcw, ShieldCheck, Store, Truck, Users, Wallet,
} from "lucide-react";
import VendorForm from "./VendorRegistrationForm";
import { Button } from "../../../../components/ui/button";
import { useCustomerAccessGuard } from "../../Hooks/AccessCRF/CustomerAccess";
import { useAuth } from "../../Auth/AuthContext/Context";
import api from "../../../Services/Api";
import { CONTACT_EMAIL } from "../../../PublicUiForAll/PublicUi/Legal/legalContent";

// Keep VENDOR_TERMS_VERSION equal to CURRENT_VERSION in backend/core/vendor_terms.py.
// Change both whenever these terms change in a way vendors must accept again.
const VENDOR_TERMS_VERSION = "2026-11-09";
const LAST_UPDATED = "9 November 2026";

// Business rules quoted in the text below. They mirror the platform:
// customer price = vendor price x 1.7 (ReactSerializers.models.Item.get_item_final_price),
// 72-hour customer confirmation window (order.fulfillment.CUSTOMER_CONFIRMATION_DAYS),
// 48-hour hold on changed payout details (settings.PAYOUT_DESTINATION_HOLD_HOURS).
const CUSTOMER_PRICE_MULTIPLIER = 1.7;
const CONFIRMATION_DAYS = 3;
const PAYOUT_HOLD_HOURS = 48;
const MIN_PRODUCTS = 5;

const kes = (value) =>
  `KES ${Number(value || 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;

const AT_A_GLANCE = [
  { icon: Banknote, title: "Free to join", text: "Registering and listing products costs nothing." },
  { icon: Wallet, title: "You get your price", text: "You are paid the price you set for every item sold, in full." },
  { icon: ShieldCheck, title: `Paid after ${CONFIRMATION_DAYS} days`, text: "Payment follows customer confirmation, or the 3-day window ending." },
  { icon: RotateCcw, title: "Returns are shared", text: "Approved returns can be held or deducted from your payouts." },
];

const SECTIONS = [
  {
    id: "eligibility",
    icon: Store,
    title: "Who can sell",
    points: [
      "You may sell handmade, locally produced or unique products that you made, own, or are legally allowed to sell.",
      "Businesses and individuals of any size are welcome if they meet these standards.",
      "Counterfeit, stolen, misleading or unauthorised products are never allowed, and neither is anything illegal or unsafe to sell.",
      "Our team reviews every application. We can approve, ask for more information, or decline an application, and we explain why where we can.",
    ],
  },
  {
    id: "application",
    icon: BadgeCheck,
    title: "Your application and approval",
    points: [
      "Give true and complete personal, business, contact and payout details, including your national ID number. Keep them up to date.",
      "Provide a working phone number and email address. We use them for orders, sales and account matters.",
      "You must have a workshop, production area or verified location where your products are made or managed.",
      `We normally expect at least ${MIN_PRODUCTS} products ready for review. Each needs accurate descriptions, clear photos, a price, stock and specifications. We may approve with fewer at our discretion.`,
      "Organic, food and other regulated products need the certificates the law requires (for example KEBS). Tell us honestly if you are certified.",
      "When you are approved you get access to the Vendor Portal to manage products, orders, blogs, banners and your business details.",
    ],
  },
  {
    id: "pricing",
    icon: Wallet,
    title: "Prices and the marketplace margin",
    callout: {
      tone: "important",
      text: `You set your own price for each item. Customers see that price plus the marketplace margin (your price × ${CUSTOMER_PRICE_MULTIPLIER}). You receive your own price in full for each item sold. There is no other fee taken from it.`,
    },
    points: [
      "Registration and listing are free. We earn the marketplace margin only when a sale is completed.",
      "The margin pays for running the marketplace, dispatch inspection, delivery to the customer and support.",
      "If you put an item on offer or discount it, the customer price follows your new price in the same way, and returns to normal when the offer ends.",
      "All prices are in Kenya shillings (KES). If we ever change the margin, we will update these terms, tell you, and ask you to accept again.",
    ],
    calculator: true,
  },
  {
    id: "stock",
    icon: PackageCheck,
    title: "Stock and product accuracy",
    points: [
      "What the customer receives must match your description, photos and specifications.",
      "Keep stock numbers accurate. Update them as soon as something sells out or comes back. Customers see stock in real time.",
      "Do not list items you cannot supply. Repeated cancellations because of stock errors can lead to suspension.",
      "Products, blogs, banners and promotions are reviewed by our team before they are published, and we can ask you to change or remove them.",
    ],
  },
  {
    id: "orders",
    icon: Truck,
    title: "Orders, preparation and dispatch",
    points: [
      "You are told about each paid order straight away. Move it through the stages in the Vendor Portal (processing, packing, ready) and add notes if something affects the customer.",
      "Prepare orders within the time shown on the order and bring them to the Maa Mara dispatch centre on time.",
      "Check that you are sending the right item, in the right quantity, well packed. We inspect it at dispatch and arrange the courier, so you do not ship to the customer yourself.",
      "If you cannot fulfil an order, tell us immediately so we can fix it with the customer.",
    ],
  },
  {
    id: "delivery",
    icon: Clock,
    title: `Delivery and the ${CONFIRMATION_DAYS}-day confirmation window`,
    callout: {
      tone: "important",
      text: `After delivery is reported, the customer has ${CONFIRMATION_DAYS} days to confirm they are happy or report a problem. If they do neither, the order completes automatically. If a problem is reported, the item is held while our team reviews it.`,
    },
    points: [
      "Cooperate quickly when we ask for photos, details or a replacement.",
      "Do not contact customers outside the platform to change an order, ask for payment or pressure them to confirm.",
    ],
  },
  {
    id: "payouts",
    icon: Banknote,
    title: "How and when you are paid",
    points: [
      `An item becomes payable once the customer has accepted it, or the ${CONFIRMATION_DAYS}-day window has ended without a problem, and our checks are complete.`,
      "Payouts are sent in scheduled batches, which are approved by our team before money is sent. Where weekly payouts are running, a cycle covers Monday to Sunday (East Africa Time). Your Vendor Portal shows what is owed and what has been paid.",
      "We pay to the method you chose at registration: M-Pesa, Till or Paybill, bank transfer or PayPal. You are responsible for giving correct details. Money sent to the details you gave us cannot always be recovered.",
      `If you change your payout details, the new details cannot receive money for ${PAYOUT_HOLD_HOURS} hours. This protects you if someone else gains access to your account.`,
      "Please do not call or message us about a pending payment before the customer confirmation and verification steps are complete. Check the portal first.",
      "You are responsible for your own taxes, licences and business registration.",
    ],
  },
  {
    id: "returns",
    icon: RotateCcw,
    title: "Returns, refunds and disputes",
    callout: {
      tone: "warning",
      text: "If a return or refund is approved, we may hold, reduce or reverse the payout for that item, including by deducting it from your future payouts.",
    },
    points: [
      "A customer can request a return if an item is incorrect, damaged, defective or clearly different from your listing.",
      "Our team reviews each request, may contact you for detail, and decides. The customer may choose a refund or an exchange. You must cooperate with returns, replacements and refunds.",
      "Items under review or dispute are held and are not paid until the matter is settled.",
    ],
  },
  {
    id: "content",
    icon: Users,
    title: "Content, reviews and community rules",
    points: [
      "Everything you post (product text, photos, videos, blogs, banners, replies) must be yours to use and must be honest. Do not post anything abusive, hateful, threatening, sexual, violent, illegal or misleading.",
      "If you use our AI tools, the result is only a draft. You are responsible for checking facts, prices and claims. Blog posts written with AI are labelled “Written with AI assistance” and are approved by our team before they appear.",
      "Never post fake reviews, pay for reviews, or pressure customers about reviews. Do not put phone numbers, emails or links to other shops in public posts.",
      "Customers and other users can report content or block accounts. We review every report within 24 hours and may remove content or suspend accounts. You are not told who reported you, and you can ask us to review a decision by emailing us.",
    ],
  },
  {
    id: "conduct",
    icon: Ban,
    title: "Prohibited conduct and customer data",
    points: [
      "No counterfeit or illegal goods, no fake orders, no manipulating stock, prices, ratings or promotions, and no harassing customers, staff or other vendors.",
      "Customer details (name, phone, address) are given to you only to prepare and deliver an order. Do not keep them for other purposes, share them or use them for marketing.",
      "Do not try to take customers off the platform to avoid the marketplace margin.",
    ],
  },
  {
    id: "account",
    icon: Lock,
    title: "Account security, suspension and closing",
    points: [
      "Keep your login private. Everything done through your account is treated as done by you. Tell us at once if you think someone else has access.",
      "We may suspend or end an account for breaking these terms, for fraud, for repeated customer complaints, or if the law requires it. Where we can, we will tell you why. Money already earned from completed orders is still paid, subject to returns, disputes and legal holds.",
      "You can ask to close your vendor account. Open orders must be finished first. Contact us and we will handle it, normally within 30 days. We keep financial and order records for as long as the law requires.",
    ],
  },
  {
    id: "general",
    icon: FileText,
    title: "Changes and general terms",
    points: [
      "We may update these terms. When changes affect you, we will tell you and ask you to accept the new version.",
      "These terms work together with our Terms and Conditions and Privacy Policy. If they differ, these Vendor Terms apply to your selling.",
      "These terms are governed by the laws of Kenya. Questions? Email us at the address below.",
    ],
  },
];

const ACKNOWLEDGEMENTS = [
  { key: "pricing", text: `I understand customers pay my price × ${CUSTOMER_PRICE_MULTIPLIER} and that I receive my own listed price in full for each item sold.` },
  { key: "payouts", text: `I understand I am paid after the customer confirms or the ${CONFIRMATION_DAYS}-day window ends, to the payout details I gave, and that changed details wait ${PAYOUT_HOLD_HOURS} hours.` },
  { key: "returns", text: "I understand approved returns and refunds can be held or deducted from my payouts, and that I must cooperate with them." },
  { key: "quality", text: "I will sell only genuine products that match their descriptions, keep stock accurate, and have the certificates the law requires." },
  { key: "conduct", text: "I will follow the community rules, I am responsible for what I post (including AI drafts), and I accept that Maa Mara Market may remove content or suspend accounts that break the rules." },
];

function PriceExample() {
  const [price, setPrice] = useState("1000");
  const vendorPrice = Math.max(0, Number(price) || 0);
  const customerPays = vendorPrice * CUSTOMER_PRICE_MULTIPLIER;
  return (
    <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-4">
      <p className="text-sm font-semibold text-card-foreground">Try it: what does a customer pay for your item?</p>
      <label className="mt-3 block text-xs font-medium text-muted-foreground" htmlFor="vendor-price-example">
        Your price (KES)
      </label>
      <input
        id="vendor-price-example"
        type="number"
        inputMode="decimal"
        min="0"
        value={price}
        onChange={(event) => setPrice(event.target.value)}
        className="mt-1 w-full max-w-[200px] rounded-xl border border-border bg-background px-3 py-2 text-base font-semibold text-foreground outline-none focus:ring-2 focus:ring-primary/30"
      />
      <dl className="mt-4 grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl bg-background p-3">
          <dt className="text-xs text-muted-foreground">Customer pays</dt>
          <dd className="mt-1 text-base font-bold text-card-foreground">{kes(customerPays)}</dd>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/40">
          <dt className="text-xs text-emerald-800 dark:text-emerald-300">You receive</dt>
          <dd className="mt-1 text-base font-bold text-emerald-900 dark:text-emerald-200">{kes(vendorPrice)}</dd>
        </div>
        <div className="rounded-xl bg-background p-3">
          <dt className="text-xs text-muted-foreground">Marketplace margin</dt>
          <dd className="mt-1 text-base font-bold text-card-foreground">{kes(customerPays - vendorPrice)}</dd>
        </div>
      </dl>
    </div>
  );
}

function Callout({ tone, children }) {
  const warning = tone === "warning";
  return (
    <div
      role="note"
      className={`mt-3 flex gap-3 rounded-2xl border p-4 text-sm leading-relaxed ${
        warning
          ? "border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-100"
          : "border-primary/30 bg-primary/10 text-card-foreground"
      }`}
    >
      {warning ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" aria-hidden="true" /> : <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />}
      <p className="font-medium">{children}</p>
    </div>
  );
}

const VendorRegistration = () => {
  const isAllowed = useCustomerAccessGuard();
  const { user } = useAuth();

  const [status, setStatus] = useState("loading"); // loading | terms | accepted
  const [seen, setSeen] = useState(() => new Set());
  const [checked, setChecked] = useState({});
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const sectionRefs = useRef({});
  const endRef = useRef(null);

  // The server is the source of truth for whether this version was accepted.
  useEffect(() => {
    let cancelled = false;
    api.get("/api/vendor-terms/")
      .then(({ data }) => { if (!cancelled) setStatus(data?.accepted && data?.version === VENDOR_TERMS_VERSION ? "accepted" : "terms"); })
      .catch(() => { if (!cancelled) setStatus("terms"); });
    return () => { cancelled = true; };
  }, [user?.id]);

  // A section counts as read once the reader has scrolled past its top edge.
  const markSeen = useCallback(() => {
    const bottom = window.innerHeight * 0.85;
    setSeen((previous) => {
      let next = previous;
      const ids = [...SECTIONS.map((section) => section.id), "end"];
      ids.forEach((id) => {
        const node = id === "end" ? endRef.current : sectionRefs.current[id];
        if (node && !next.has(id) && node.getBoundingClientRect().top < bottom) {
          if (next === previous) next = new Set(previous);
          next.add(id);
        }
      });
      return next;
    });
  }, []);

  useEffect(() => {
    if (status !== "terms") return undefined;
    markSeen();
    window.addEventListener("scroll", markSeen, { passive: true });
    window.addEventListener("resize", markSeen);
    return () => {
      window.removeEventListener("scroll", markSeen);
      window.removeEventListener("resize", markSeen);
    };
  }, [status, markSeen]);

  const total = SECTIONS.length + 1;
  const progress = Math.round((seen.size / total) * 100);
  const readAll = seen.size >= total;
  const allChecked = ACKNOWLEDGEMENTS.every((item) => checked[item.key]);
  const remaining = useMemo(() => SECTIONS.filter((section) => !seen.has(section.id)).length, [seen]);

  if (!isAllowed) return null;
  if (status === "accepted") return <VendorForm />;
  if (status === "loading") {
    return <div className="mx-auto max-w-3xl px-4 py-24 text-center text-sm text-muted-foreground" role="status">Loading…</div>;
  }

  const accept = async (event) => {
    event.preventDefault();
    if (!readAll || !allChecked || saving) return;
    setSaving(true);
    setError("");
    try {
      await api.post("/api/vendor-terms/", {
        version: VENDOR_TERMS_VERSION,
        acknowledgements: ACKNOWLEDGEMENTS.map((item) => item.key),
      });
      setStatus("accepted");
      window.scrollTo({ top: 0 });
    } catch (requestError) {
      setError(requestError?.response?.data?.detail || "We could not save your agreement. Please check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  const jumpTo = (id) => sectionRefs.current[id]?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="mx-auto w-full max-w-6xl px-3 pb-16 pt-20 sm:px-6 lg:pt-24">
      {/* Hero */}
      <header className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
        <div className="bg-gradient-to-br from-emerald-50 via-card to-amber-50 p-6 dark:from-emerald-950/30 dark:via-card dark:to-amber-950/20 md:p-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-background/80 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            <Store className="h-3.5 w-3.5" aria-hidden="true" /> Become a vendor
          </p>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-card-foreground md:text-4xl">
            Maa Mara Market Vendor Terms
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Please read these terms carefully. They explain how you are paid, what we expect from you, and what happens if
            something goes wrong. It takes about five minutes. You will confirm a few key points at the end before you can apply.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Version {VENDOR_TERMS_VERSION} · Updated {LAST_UPDATED}</p>
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-2 md:p-6 lg:grid-cols-4">
          {AT_A_GLANCE.map(({ icon: Icon, title, text }) => (
            <div key={title} className="rounded-2xl border border-border bg-background p-4">
              <Icon className="h-5 w-5 text-primary" aria-hidden="true" />
              <p className="mt-2 text-sm font-bold text-card-foreground">{title}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </header>

      {/* Sticky reading progress */}
      <div className="sticky top-16 z-30 mt-4 rounded-2xl border border-border bg-card/95 px-4 py-3 shadow-sm backdrop-blur md:top-20" aria-live="polite">
        <div className="flex items-center justify-between gap-3 text-xs font-semibold text-card-foreground">
          <span>{readAll ? "You have reached the end. Please confirm below." : `Reading progress: ${progress}%`}</span>
          {!readAll && <span className="text-muted-foreground">{remaining} section{remaining === 1 ? "" : "s"} to go</span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress} aria-label="Reading progress">
          <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Contents */}
        <nav aria-label="Contents" className="hidden lg:block">
          <ol className="sticky top-44 space-y-1 text-sm">
            {SECTIONS.map((section, index) => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => jumpTo(section.id)}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-muted-foreground transition hover:bg-muted hover:text-card-foreground"
                >
                  <span className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[10px] font-bold ${seen.has(section.id) ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    {seen.has(section.id) ? <Check className="h-3 w-3" aria-hidden="true" /> : index + 1}
                  </span>
                  <span className="truncate">{section.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        {/* Terms */}
        <div className="space-y-4">
          {SECTIONS.map(({ id, icon: Icon, title, points, callout, calculator }, index) => (
            <section
              key={id}
              id={id}
              ref={(node) => { sectionRefs.current[id] = node; }}
              className="scroll-mt-40 rounded-3xl border border-border bg-card p-5 shadow-sm md:p-7"
              aria-labelledby={`${id}-title`}
            >
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Part {index + 1} of {SECTIONS.length}</p>
                  <h2 id={`${id}-title`} className="text-lg font-bold leading-snug text-card-foreground md:text-xl">{title}</h2>
                </div>
              </div>

              {callout && <Callout tone={callout.tone}>{callout.text}</Callout>}
              {calculator && <PriceExample />}

              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-card-foreground md:text-base">
                {points.map((point) => (
                  <li key={point} className="flex gap-3">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}

          <p className="px-2 text-sm text-muted-foreground">
            Read the full <Link to="/terms" className="font-semibold text-primary underline underline-offset-2">Terms and Conditions</Link> and{" "}
            <Link to="/privacy" className="font-semibold text-primary underline underline-offset-2">Privacy Policy</Link>. Questions about these terms? Email{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-primary underline underline-offset-2">{CONTACT_EMAIL}</a>.
          </p>

          <div ref={endRef} aria-hidden="true" />

          {/* Agreement */}
          <form onSubmit={accept} className="rounded-3xl border-2 border-primary/40 bg-card p-5 shadow-md md:p-7" aria-labelledby="agree-title">
            <h2 id="agree-title" className="text-lg font-bold text-card-foreground md:text-xl">Confirm you understand</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {readAll ? "Tick each statement to continue. This is saved with your account." : "Scroll to the end of the terms to unlock this step."}
            </p>

            <fieldset disabled={!readAll} className={`mt-4 space-y-3 ${readAll ? "" : "opacity-50"}`}>
              <legend className="sr-only">Key points you must confirm</legend>
              {ACKNOWLEDGEMENTS.map((item) => (
                <label key={item.key} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-background p-3 text-sm leading-relaxed transition hover:bg-muted/60">
                  <input
                    type="checkbox"
                    className="mt-1 h-5 w-5 shrink-0 accent-[hsl(var(--primary))]"
                    checked={Boolean(checked[item.key])}
                    onChange={(event) => setChecked((current) => ({ ...current, [item.key]: event.target.checked }))}
                  />
                  <span>{item.text}</span>
                </label>
              ))}
            </fieldset>

            {error && <p role="alert" className="mt-3 text-sm font-medium text-destructive">{error}</p>}

            <div className="mt-6 flex justify-center">
              <Button type="submit" disabled={!readAll || !allChecked || saving} className="primary-button min-h-[48px] w-full px-8 sm:w-auto">
                {saving ? "Saving…" : "I agree. Continue to vendor registration"}
              </Button>
            </div>
            {readAll && !allChecked && (
              <p className="mt-2 text-center text-xs text-muted-foreground">Tick all {ACKNOWLEDGEMENTS.length} statements to continue.</p>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default VendorRegistration;
