import React, { useEffect, useState } from "react";
import axios from "axios";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

const reactionTypes = ['like', 'dislike', 'laugh', 'angry'];

const ReviewSection = ({ item, authToken }) => {
  const [reviewText, setReviewText] = useState("");
  const [rating, setRating] = useState(5);
  const [posting, setPosting] = useState(false);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await axios.get(`${baseUrl}/api/items/${item.id}/reviews/`);
      const data = response.data;
  
      // Use the paginated 'results' array for reviews
      setReviews(Array.isArray(data.results) ? data.results : []);
    } catch (err) {
      console.error("Failed to fetch reviews", err);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };
  

  useEffect(() => {
    fetchReviews();
  }, [item?.id]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();

    if (!reviewText.trim() || rating < 1 || rating > 5) {
      alert("Please enter a valid review and rating.");
      return;
    }

    try {
      setPosting(true);
      await axios.post(
        `${baseUrl}/api/reviews/`,
        {
          item: item.id,
          rating,
          review_text: reviewText,
        },
        {
          withCredentials: true,
        }
      );
      alert("Review submitted!");
      setReviewText("");
      setRating(5);
      fetchReviews(); // refresh
    } catch (err) {
      console.error("Review submission failed", err);
      alert("Failed to post review.");
    } finally {
      setPosting(false);
    }
  };

  const handleReaction = async (reviewId, reactionType) => {
    try {
      await axios.post(
        `${baseUrl}/api/reactions/`,
        {
          review: reviewId,
          reaction_type: reactionType,
        },
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      alert(`Reacted with ${reactionType}`);
      fetchReviews(); // refresh
    } catch (err) {
      console.error("Failed to react", err);
      alert("Reaction failed.");
    }
  };

  return (
    <div className="mt-12">
      <h3 className="text-xl font-semibold mb-4">Write a Review</h3>

      <form onSubmit={handleSubmitReview} className="mb-10 space-y-4">
        <div>
          <label className="block text-sm font-medium">Rating:</label>
          <select
            value={rating}
            onChange={(e) => setRating(parseInt(e.target.value))}
            className="border rounded px-3 py-2"
          >
            {[1, 2, 3, 4, 5].map((star) => (
              <option key={star} value={star}>
                {star} Star{star > 1 && "s"}
              </option>
            ))}
          </select>
        </div>
        <div>
          <textarea
            rows={4}
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Write your thoughts here..."
            className="w-full border rounded px-3 py-2"
          />
        </div>
        <button
          type="submit"
          disabled={posting}
          className="bg-black text-white py-2 px-4 rounded"
        >
          {posting ? "Posting..." : "Submit Review"}
        </button>
      </form>

      <h3 className="text-xl font-semibold mb-4">Reviews</h3>

      {loadingReviews ? (
        <p>Loading reviews...</p>
      ) : reviews.length === 0 ? (
        <p>No reviews yet.</p>
      ) : (
        reviews.map((review) => (
          <div key={review.id} className="border rounded p-4 mb-4">
            <p className="font-semibold">{review.user}</p>
            <p className="text-sm text-gray-600">Rating: {review.rating}/5</p>
            <p className="mt-2">{review.review_text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {reactionTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => handleReaction(review.id, type)}
                  className="border px-3 py-1 rounded text-sm hover:bg-gray-100"
                >
                  {type}
                </button>
              ))}
            </div>
            {Array.isArray(review.reactions) && review.reactions.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                {review.reactions.map((r) => (
                  <span key={r.id} className="mr-3">
                    {r.user}: <strong>{r.reaction_type}</strong>
                  </span>
                ))}
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
};

export default ReviewSection;
