import React, { useCallback, useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  closeSharp,
  eyeSharp,
  cartSharp,
  cashSharp,
  heartSharp,
  cubeSharp,
  trendingUpSharp,
  sparklesSharp,
  refreshSharp,
  timeSharp,
} from "ionicons/icons";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import dayjs from "dayjs";
import api from "../../../Services/Api";

const RANGES = [7, 30, 90];

const STATUS = {
  fast_moving: { label: "Selling fast", className: "bg-green-100 text-green-800" },
  moving: { label: "Selling steadily", className: "bg-blue-100 text-blue-800" },
  slow: { label: "Selling slowly", className: "bg-amber-100 text-amber-800" },
  not_moving: { label: "Not selling", className: "bg-red-100 text-red-800" },
};

const LEVEL_STYLES = {
  critical: "border-red-200 bg-red-50 text-red-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-blue-200 bg-blue-50 text-blue-900",
  good: "border-green-200 bg-green-50 text-green-900",
};

const IMPACT_STYLES = {
  high: "bg-green-100 text-green-800",
  medium: "bg-blue-100 text-blue-800",
  low: "bg-gray-100 text-gray-700",
};

const TYPE_LABELS = {
  offer: "Offer",
  price: "Price",
  content: "Listing",
  stock: "Stock",
  promotion: "Promotion",
  other: "Idea",
};

const money = (value) => "KES " + Number(value || 0).toLocaleString();

const Tile = ({ icon, label, value, hint }) => (
  <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
    <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
      <IonIcon icon={icon} className="text-base text-[#2563eb]" />
      {label}
    </div>
    <p className="mt-1.5 text-lg font-bold text-gray-900">{value}</p>
    {hint ? <p className="mt-0.5 text-xs text-gray-500">{hint}</p> : null}
  </div>
);

const formatRemaining = (seconds) => {
  const total = Number(seconds || 0);
  if (total <= 0) return "ended";
  const days = Math.floor(total / 86400);
  const hours = Math.floor((total % 86400) / 3600);
  return days > 0 ? `${days}d ${hours}h left` : `${hours}h ${Math.floor((total % 3600) / 60)}m left`;
};

const ItemInsightsModal = ({ open, itemId, itemName, onClose, onStartOffer }) => {
  const [days, setDays] = useState(30);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [ai, setAi] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  const loadInsights = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`/api/items/${itemId}/insights/`, {
        params: { days },
        withCredentials: true,
      });
      setData(response.data);
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not load the item's numbers. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [itemId, days]);

  useEffect(() => {
    if (open && itemId) loadInsights();
  }, [open, itemId, loadInsights]);

  // The AI answer belongs to one date range, so changing the range clears it.
  useEffect(() => {
    setAi(null);
    setAiError("");
  }, [days, itemId]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  const askAi = async (refresh = false) => {
    setAiLoading(true);
    setAiError("");
    try {
      const response = await api.post(
        `/api/items/${itemId}/insights/ai/`,
        { days, refresh },
        { withCredentials: true, timeout: 90000 }
      );
      setAi(response.data);
    } catch (err) {
      setAiError(err?.response?.data?.detail || "Could not get AI suggestions right now. Please try again shortly.");
    } finally {
      setAiLoading(false);
    }
  };

  const chartData = useMemo(
    () =>
      (data?.series || []).map((point) => ({
        ...point,
        label: dayjs(point.date).format(days > 30 ? "D MMM" : "D MMM"),
      })),
    [data, days]
  );

  if (!open) return null;

  const metrics = data?.metrics;
  const status = metrics ? STATUS[metrics.status] || STATUS.slow : null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Item performance and AI suggestions"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose?.();
      }}
    >
      <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-t-2xl bg-gray-50 shadow-2xl sm:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-gray-200 bg-white px-4 py-4 sm:px-6">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-[#2563eb]">Item insights</p>
            <h2 className="truncate text-lg font-bold text-gray-900">{itemName || data?.item?.name || "Item"}</h2>
            {status && (
              <span className={"mt-1 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold " + status.className}>
                {status.label}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
          >
            <IonIcon icon={closeSharp} />
          </button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto px-4 py-4 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            {RANGES.map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDays(range)}
                className={
                  "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition " +
                  (days === range
                    ? "border-[#2563eb] bg-[#2563eb] text-white"
                    : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100")
                }
              >
                Last {range} days
              </button>
            ))}
          </div>

          {loading && !data && <p className="py-10 text-center text-sm text-gray-500">Loading the numbers…</p>}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}{" "}
              <button type="button" onClick={loadInsights} className="font-semibold underline">
                Try again
              </button>
            </div>
          )}

          {metrics && (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                <Tile icon={eyeSharp} label="Views" value={metrics.views.toLocaleString()} />
                <Tile icon={cartSharp} label="Sold" value={metrics.units_sold.toLocaleString()} hint="units" />
                <Tile icon={cashSharp} label="Revenue" value={money(metrics.revenue)} />
                <Tile
                  icon={trendingUpSharp}
                  label="Buy rate"
                  value={metrics.conversion_rate == null ? "—" : metrics.conversion_rate + "%"}
                  hint="views that sold"
                />
                <Tile icon={heartSharp} label="Saved" value={metrics.wishlist_count} hint="wishlists" />
                <Tile
                  icon={cubeSharp}
                  label="Stock"
                  value={metrics.stock == null ? "—" : metrics.stock}
                  hint={metrics.review_count ? `${metrics.review_average}/5 · ${metrics.review_count} reviews` : "no reviews yet"}
                />
              </div>

              {metrics.offer && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                  <IonIcon icon={timeSharp} />
                  <span>
                    Offer running: <strong>{metrics.offer.discount_percentage}% off</strong> until{" "}
                    {dayjs(metrics.offer.end_date).format("D MMM YYYY, h:mm A")} (
                    {formatRemaining(metrics.offer.seconds_remaining)}). After that the price goes back to normal on its own.
                  </span>
                </div>
              )}

              <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <h3 className="text-sm font-bold text-gray-900">Views and sales each day</h3>
                <div className="mt-3 h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: -12 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" minTickGap={24} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: 12 }} />
                      <Bar dataKey="units" name="Units sold" fill="#16a34a" radius={[4, 4, 0, 0]} />
                      <Line type="monotone" dataKey="views" name="Views" stroke="#2563eb" strokeWidth={2} dot={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Second half of this period: {metrics.trend.units_recent} sold / {metrics.trend.views_recent} views, against{" "}
                  {metrics.trend.units_earlier} sold / {metrics.trend.views_earlier} views in the first half.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="text-sm font-bold text-gray-900">What the numbers say</h3>
                {(data.observations || []).map((note, index) => (
                  <div key={index} className={"rounded-xl border px-4 py-3 text-sm " + (LEVEL_STYLES[note.level] || LEVEL_STYLES.info)}>
                    {note.text}
                  </div>
                ))}
              </section>

              <section className="rounded-2xl border border-[#2563eb]/30 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="flex items-center gap-2 text-base font-bold text-gray-900">
                      <IonIcon icon={sparklesSharp} className="text-[#2563eb]" />
                      How to sell more of this item
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">
                      AI studies this item's numbers and compares with similar products on other websites, then suggests what to do.
                    </p>
                  </div>
                  {!ai && (
                    <button
                      type="button"
                      onClick={() => askAi(false)}
                      disabled={aiLoading || data.ai_available === false}
                      className="inline-flex items-center gap-2 rounded-full bg-[#2563eb] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <IonIcon icon={sparklesSharp} />
                      {aiLoading ? "Thinking…" : "Get suggestions from AI"}
                    </button>
                  )}
                </div>

                {data.ai_available === false && (
                  <p className="mt-3 text-sm text-amber-800">AI suggestions are not switched on for the site yet.</p>
                )}
                {aiLoading && <p className="mt-4 text-sm text-gray-500">Looking at your numbers and the market. This can take up to a minute…</p>}
                {aiError && (
                  <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">{aiError}</p>
                )}

                {ai && (
                  <div className="mt-5 space-y-5">
                    {ai.verdict && <p className="text-base font-semibold text-gray-900">{ai.verdict}</p>}
                    {ai.why?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Why it is moving this way</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                          {ai.why.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-900">What to do</h4>
                      {ai.recommendations.map((rec, index) => (
                        <div key={index} className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-gray-700 ring-1 ring-gray-200">
                              {TYPE_LABELS[rec.type] || "Idea"}
                            </span>
                            <span className={"rounded-full px-2.5 py-0.5 text-xs font-semibold " + (IMPACT_STYLES[rec.impact] || IMPACT_STYLES.medium)}>
                              {rec.impact} impact
                            </span>
                          </div>
                          <p className="mt-2 text-sm font-semibold text-gray-900">{rec.title}</p>
                          {rec.detail && <p className="mt-1 text-sm leading-6 text-gray-700">{rec.detail}</p>}
                          {rec.suggested_price && (
                            <p className="mt-2 text-sm text-gray-700">
                              Suggested price: <strong>{money(rec.suggested_price)}</strong>. Price changes are sent for approval from the item's edit page.
                            </p>
                          )}
                          {rec.suggested_discount_percent && (
                            <div className="mt-3 flex flex-wrap items-center gap-3">
                              <span className="text-sm text-gray-700">
                                <strong>{rec.suggested_discount_percent}% off</strong>
                                {rec.suggested_offer_days ? ` for ${rec.suggested_offer_days} days` : ""}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  onStartOffer?.({
                                    percent: Math.round(rec.suggested_discount_percent),
                                    days: rec.suggested_offer_days || 7,
                                  })
                                }
                                className="rounded-full bg-[#2563eb] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
                              >
                                Set up this offer
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {ai.market_notes?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">What similar products look like elsewhere</h4>
                        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">
                          {ai.market_notes.map((line, index) => (
                            <li key={index}>{line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {ai.sources?.length > 0 && (
                      <div>
                        <h4 className="text-sm font-bold text-gray-900">Sources</h4>
                        <ul className="mt-2 space-y-1 text-sm">
                          {ai.sources.map((source) => (
                            <li key={source.url}>
                              <a href={source.url} target="_blank" rel="noopener noreferrer" className="break-all text-[#2563eb] underline">
                                {source.title}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-500">
                        AI suggestions are a guide, not a promise. {ai.generated_at ? "Made " + dayjs(ai.generated_at).format("D MMM, h:mm A") + "." : ""}
                      </p>
                      <button
                        type="button"
                        onClick={() => askAi(true)}
                        disabled={aiLoading}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm font-semibold text-gray-700 hover:bg-gray-100 disabled:opacity-60"
                      >
                        <IonIcon icon={refreshSharp} />
                        {aiLoading ? "Working…" : "Ask again"}
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ItemInsightsModal;
