import React, { useEffect, useState } from "react";
import api from "../../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import VendorRatingForm from "./VendorRatingsAndShop";

// MUI Alert wrapper
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ReviewSection = ({ item }) => {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [posting, setPosting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [averageItemRating, setAverageItemRating] = useState(0);
  const [showAllReviews, setShowAllReviews] = useState(false);

  const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  // Fetch reviews
  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await api.get(`/api/items/${item.id}/reviews/`);
      const results = Array.isArray(response.data.results) ? response.data.results : [];
      setReviews(results);

      const avg = results.length ? results.reduce((sum, r) => sum + r.rating, 0) / results.length : 0;
      setAverageItemRating(avg.toFixed(1));
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      setSnackbar({ open: true, message: "Failed to load reviews.", severity: "error" });
    } finally {
      setLoadingReviews(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, [item?.id]);

  // Submit item review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || rating < 1 || rating > 5) {
      setSnackbar({ open: true, message: "Enter a valid review and rating.", severity: "warning" });
      return;
    }
    try {
      setPosting(true);
      await api.post(`/api/items/${item.id}/reviews/`, { rating, review_text: reviewText }, {
        withCredentials: true,
      });
      setSnackbar({ open: true, message: "Review submitted!", severity: "success" });
      setReviewText("");
      setRating(5);
      fetchReviews();
    } catch {
      setSnackbar({ open: true, message: "Failed to post review.", severity: "error" });
    } finally {
      setPosting(false);
    }
  };

  const renderStars = (num) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < num ? "text-amber-600" : "text-gray-300"}>★</span>
  ));

  const truncateReview = (text, limit = 24) => {
    const words = String(text || "").trim().split(/\s+/).filter(Boolean);
    return words.length > limit ? `${words.slice(0, limit).join(" ")}…` : String(text || "").trim();
  };

  return (
    <div className="mt-12 space-y-6">
      {/* Snackbar */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-bold text-card-foreground sm:text-lg">Item rating & review</h3>
            <div className="mt-2 flex items-center gap-2">
              {renderStars(Math.round(Number(averageItemRating) || 0))}
              <span className="text-sm text-muted-foreground">{averageItemRating || "0.0"}/5</span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">{reviews.length} review{reviews.length === 1 ? "" : "s"}</span>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <h4 className="text-sm font-bold text-card-foreground">Write a Review</h4>
          <form onSubmit={handleSubmitReview} className="mt-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-card-foreground">Rating:</span>
              <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm">
                {[1,2,3,4,5].map((star) => <option key={star} value={star}>{star} Star{star>1&&"s"}</option>)}
              </select>
            </div>
            <textarea
              rows={4}
              value={reviewText}
              onChange={(e)=>setReviewText(e.target.value)}
              placeholder="Write your thoughts here..."
              className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-border"
            />
            <button type="submit" disabled={posting} className="rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">
              {posting ? "Posting..." : "Submit Review"}
            </button>
          </form>
        </div>

        <div className="mt-5 border-t border-border pt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-bold text-card-foreground">Reviews</h4>
              <p className="text-xs text-muted-foreground">Recent feedback from customers.</p>
            </div>
          </div>

          {loadingReviews ? (
            <p className="text-sm text-muted-foreground">Loading reviews...</p>
          ) : reviews.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reviews yet.</p>
          ) : (
            <>
              <div className="flex gap-4 overflow-x-auto pb-3 snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {(showAllReviews ? reviews : reviews.slice(0, 5)).map((review) => (
                  <article key={review.id} className="min-w-[260px] max-w-[320px] flex-none snap-start rounded-2xl border border-border bg-background p-4">
                    <div className="flex items-center gap-3">
                      <Avatar src={review.user?.profile_picture || ""} sx={{ width: 32, height: 32 }}>
                        {!review.user && "V"}
                      </Avatar>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-card-foreground">{review.user?.username || "Visitor"}</p>
                        <div className="mt-0.5">{renderStars(review.rating)}</div>
                      </div>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-card-foreground">{truncateReview(review.review_text)}</p>
                  </article>
                ))}
              </div>

              {reviews.length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllReviews((value) => !value)}
                  className="mt-2 w-full rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
                >
                  {showAllReviews ? "View fewer reviews" : "View all reviews"}
                </button>
              )}
            </>
          )}
        </div>
      </section>

      {/* Shop rating form remains separate for the shop-review workflow; shop rating summaries are shown in the marketplace shop section. */}
      {item?.vendor?.id && (
        <VendorRatingForm
          vendorId={item.vendor.id}
          onRated={() => {}}
        />
      )}
    </div>
  );
};

export default ReviewSection;
