import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../Services/Api";

const ReviewsPage = () => {
  const [currentTab, setCurrentTab] = useState("itemReviews");
  const [reviews, setReviews] = useState({
    itemReviews: [],
    vendorReviews: [],
    vendorRates: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleTabChange = (tab) => setCurrentTab(tab);

  const renderStars = (count) => {
    const rating = Math.max(0, Math.min(5, Number(count) || 0));
    return "★".repeat(rating) + "☆".repeat(5 - rating);
  };

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await api.get("/api/vendor-reviews/");

        setReviews({
          itemReviews: res.data.itemReviews || [],
          vendorReviews: res.data.vendorReviews || [],
          vendorRates: res.data.vendorRates || [],
        });
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setError(
          err?.response?.data?.detail ||
            err?.response?.data?.message ||
            "Unable to load reviews right now."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  const totals = useMemo(
    () => ({
      itemReviews: reviews.itemReviews.length,
      vendorReviews: reviews.vendorReviews.length,
      vendorRates: reviews.vendorRates.length,
    }),
    [reviews]
  );

  const tabs = [
    { key: "itemReviews", label: "Item Reviews", count: totals.itemReviews },
    { key: "vendorReviews", label: "Vendor Reviews", count: totals.vendorReviews },
    { key: "vendorRates", label: "Vendor Rates", count: totals.vendorRates },
  ];

  return (
    <section className="w-full space-y-6">
      <header className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#f1641e]">
              Customer feedback
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222]">
              Reviews & Ratings
            </h1>
            <p className="mt-1 text-sm text-[#595959]">
              Review feedback about your products and vendor profile.
            </p>
          </div>

          <div className="rounded-xl border border-[#e6e6e4] bg-[#f8f8f6] px-4 py-3">
            <p className="text-xs font-medium text-[#595959]">Total feedback</p>
            <p className="mt-1 text-lg font-bold text-[#222]">
              {totals.itemReviews + totals.vendorReviews + totals.vendorRates}
            </p>
          </div>
        </div>
      </header>

      <section className="rounded-2xl border border-[#e6e6e4] bg-white p-2 shadow-sm sm:p-3">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
          {tabs.map((tab) => {
            const isActive = currentTab === tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => handleTabChange(tab.key)}
                className={`flex items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold transition ${
                  isActive
                    ? "bg-[#f1641e] text-white shadow-sm"
                    : "text-[#595959] hover:bg-[#f8f8f6] hover:text-[#222]"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-white/20 text-white"
                      : "bg-[#f1f1ee] text-[#595959]"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-64 items-center justify-center rounded-2xl border border-[#e6e6e4] bg-white shadow-sm">
          <div className="flex flex-col items-center gap-3 text-sm text-[#595959]">
            <div
              className="h-8 w-8 animate-spin rounded-full border-4 border-[#f1641e]/20 border-t-[#f1641e]"
              aria-label="Loading reviews"
            />
            Loading reviews...
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
          <p className="font-semibold">Unable to load reviews</p>
          <p className="mt-1">{error}</p>
        </div>
      ) : (
        <section className="space-y-3">
          {currentTab === "vendorRates" &&
            reviews.vendorRates.map(({ id, user, stars }) => (
              <article
                key={id}
                className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="font-semibold text-[#222]">{user}</p>
                  <span className="text-lg tracking-[0.1em] text-[#f4b400]" aria-label={`${stars} out of 5 stars`}>
                    {renderStars(stars)}
                  </span>
                </div>
                <p className="mt-2 text-sm text-[#595959]">
                  Rated your vendor profile {stars} out of 5.
                </p>
              </article>
            ))}

          {(currentTab === "itemReviews" || currentTab === "vendorReviews") &&
            reviews[currentTab].map((review) => (
              <article
                key={review.id}
                className="rounded-2xl border border-[#e6e6e4] bg-white p-5 shadow-sm transition hover:shadow-md"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-base font-bold text-[#222]">
                      {currentTab === "itemReviews"
                        ? `Item: ${review.itemName}`
                        : `Vendor: ${review.vendorName}`}
                    </p>
                    <p className="mt-1 text-sm text-[#777]">
                      By {review.user} · {review.date}
                    </p>
                  </div>

                  <span className="shrink-0 text-lg tracking-[0.1em] text-[#f4b400]" aria-label={`${review.rating} out of 5 stars`}>
                    {renderStars(review.rating)}
                  </span>
                </div>

                <p className="mt-4 whitespace-pre-wrap text-sm leading-6 text-[#444]">
                  {review.comment || "No comment provided."}
                </p>
              </article>
            ))}

          {reviews[currentTab].length === 0 && (
            <div className="rounded-2xl border border-dashed border-[#d7d7d3] bg-white p-10 text-center shadow-sm">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#fff0e8] text-lg text-[#f1641e]">
                ★
              </div>
              <h2 className="mt-4 text-lg font-semibold text-[#222]">
                No {tabs.find((tab) => tab.key === currentTab)?.label.toLowerCase()} found
              </h2>
              <p className="mt-1 text-sm text-[#595959]">
                Feedback will appear here when it becomes available.
              </p>
            </div>
          )}
        </section>
      )}
    </section>
  );
};

export default ReviewsPage;
