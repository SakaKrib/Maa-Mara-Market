import React, { useEffect, useState } from "react";
import api from "../../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import Avatar from "@mui/material/Avatar";
import VendorRatingForm from "./VendorRatingsAndShop";

// Reaction types matching backend
const reactionTypes = [
  { type: "like", emoji: "👍" },
  { type: "dislike", emoji: "👎" },
  { type: "laugh", emoji: "😂" },
  { type: "angry", emoji: "😡" },
];

// MUI Alert wrapper
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const ReviewSection = ({ item, authToken }) => {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [posting, setPosting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const [averageItemRating, setAverageItemRating] = useState(0);

  // Vendor Ratings
  const [vendorRating, setVendorRating] = useState({ quality: 0, communication: 0, shipping: 0 });

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

  // Fetch vendor ratings
  const fetchVendorRatings = async () => {
    if (!item?.vendor?.id) return;
    try {
      const response = await api.get(`/api/rate-V/${item.vendor.id}/rate/`, {
        
        withCredentials: true,
      });
      if (response.data?.average_ratings) {
        setVendorRating(response.data.average_ratings);
      }
    } catch (err) {
      console.error("Failed to fetch vendor ratings", err);
    }
  };

  useEffect(() => {
    fetchReviews();
    fetchVendorRatings();
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
      setReviewText(""); setRating(5);
      fetchReviews();
    } catch {
      setSnackbar({ open: true, message: "Failed to post review.", severity: "error" });
    } finally { setPosting(false); }
  };

  // Handle reactions
  const handleReaction = async (reviewId, type) => {
    try {
      await api.post(`/api/reactions/`, { review: reviewId, reaction_type: type }, {
        headers: { Authorization: authToken ? `Bearer ${authToken}` : "" },
        withCredentials: true,
      });
      setSnackbar({ open: true, message: `Reacted with ${type}`, severity: "success" });
      fetchReviews();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Reaction failed.", severity: "error" });
    }
  };

  const renderStars = (num) => Array.from({ length: 5 }, (_, i) => (
    <span key={i} className={i < num ? "text-yellow-500" : "text-gray-300"}>★</span>
  ));

  const renderVendorBars = (score) => {
    const percentage = Math.min(Math.max(score * 20, 0), 100);
    return (
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div className="bg-green-500 h-2 rounded-full" style={{ width: `${percentage}%` }} />
      </div>
    );
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

      {/* Average Item Rating */}
      <div className="flex items-center gap-3">
        <span className="font-semibold text-lg">Item Rating:</span>
        {renderStars(Math.round(averageItemRating))}
        <span className="text-gray-600 ml-2">{averageItemRating}/5</span>
      </div>

      {/* Vendor Rating Bars */}
      <div className="space-y-2">
        <h4 className="font-semibold">Shop Ratings</h4>
        {["quality", "communication", "shipping"].map((key) => (
          <div key={key} className="flex items-center gap-2">
            <span className="capitalize w-32">{key}</span>
            {renderVendorBars(vendorRating[key])}
            <span className="text-gray-600 ml-2">{vendorRating[key]}/5</span>
          </div>
        ))}
      </div>

      {/* Vendor Rating Form */}
      {item?.vendor?.id && (
        <VendorRatingForm
          vendorId={item.vendor.id}
          authToken={authToken}
          onRated={fetchVendorRatings}
        />
      )}

      {/* Review Form */}
      <h3 className="text-xl font-semibold">Write a Review</h3>
      <form onSubmit={handleSubmitReview} className="space-y-4">
        <div className="flex items-center gap-2">
          <span>Rating:</span>
          <select value={rating} onChange={(e) => setRating(parseInt(e.target.value))} className="border rounded px-3 py-1">
            {[1,2,3,4,5].map((star) => <option key={star} value={star}>{star} Star{star>1&&"s"}</option>)}
          </select>
        </div>
        <textarea
          rows={4}
          value={reviewText}
          onChange={(e)=>setReviewText(e.target.value)}
          placeholder="Write your thoughts here..."
          className="w-full border rounded px-3 py-2"
        />
        <button type="submit" disabled={posting} className="bg-black text-white py-2 px-4 rounded">
          {posting ? "Posting..." : "Submit Review"}
        </button>
      </form>

      {/* Reviews List */}
      <h3 className="text-xl font-semibold">Reviews</h3>
      {loadingReviews ? <p>Loading reviews...</p> : reviews.length === 0 ? <p>No reviews yet.</p> : (
        <div className="space-y-4">
          {reviews.map((review) => {
            const reactionCounts = reactionTypes.reduce((acc, r) => {
              acc[r.type] = review.reactions?.filter(x => x.reaction_type === r.type).length || 0;
              return acc;
            }, {});

            const userReaction = review.reactions?.find(r => authToken ? r.user === review.user?.id : !r.user);

            return (
              <div key={review.id} className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex items-center gap-3">
                  <Avatar src={review.user?.profile_picture || ""}>{!review.user && "V"}</Avatar>
                  <span className="font-semibold">{review.user?.username || "Visitor"}</span>
                  <span className="ml-auto text-yellow-500">{renderStars(review.rating)}</span>
                </div>
                <p>{review.review_text}</p>

                <div className="flex items-center gap-2 flex-wrap">
                  {reactionTypes.map((r) => (
                    <button
                      key={r.type}
                      onClick={() => handleReaction(review.id, r.type)}
                      className={`flex items-center gap-1 border px-2 py-1 rounded hover:bg-gray-200 ${userReaction?.reaction_type === r.type ? "bg-gray-300" : ""}`}
                    >
                      <span>{r.emoji}</span>
                      <span className="text-sm capitalize">{r.type}</span>
                      <span className="ml-1 text-xs text-gray-600">{reactionCounts[r.type]}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ReviewSection;
