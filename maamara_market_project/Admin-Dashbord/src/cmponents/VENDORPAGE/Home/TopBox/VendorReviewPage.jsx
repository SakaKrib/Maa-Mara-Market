import React, { useEffect, useState } from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import api from "../../../../Services/Api"; // adjust path

const ReviewsPage = () => {
  const [currentTab, setCurrentTab] = useState("itemReviews");
  const [reviews, setReviews] = useState({
    itemReviews: [],
    vendorReviews: [],
    vendorRates: [],
  });
  const [loading, setLoading] = useState(true);

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  const renderStars = (count) =>
    "★".repeat(count) + "☆".repeat(5 - count);

  // ✅ FETCH FROM BACKEND
  useEffect(() => {
    const fetchReviews = async () => {
      try {
        setLoading(true);

        const res = await api.get("/api/vendor-reviews/");

        setReviews({
          itemReviews: res.data.itemReviews || [],
          vendorReviews: res.data.vendorReviews || [],
          vendorRates: res.data.vendorRates || [],
        });

      } catch (err) {
        console.error("Failed to fetch reviews:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchReviews();
  }, []);

  if (loading) {
    return (
      <div style={{ padding: 24, color: colors.gray[100] }}>
        Loading reviews...
      </div>
    );
  }

  return (
    <div style={{ padding: 24, color: colors.gray[100], fontFamily: "Arial, sans-serif" }}>
      <h2 style={{ fontWeight: "bold", fontSize: 24, marginBottom: 24 }}>
        Reviews & Ratings
      </h2>

      {/* Toggle Buttons */}
      <div
        style={{
          display: "flex",
          width: "100%",
          marginBottom: 24,
          borderRadius: 8,
          overflow: "hidden",
          backgroundColor: colors.greenAccent[900],
          boxShadow: `0 0 6px ${colors.primary[600]}`,
        }}
      >
        {["itemReviews", "vendorReviews", "vendorRates"].map((tabKey) => {
          const labelMap = {
            itemReviews: "Item Reviews",
            vendorReviews: "Vendor Reviews",
            vendorRates: "Vendor Rates",
          };

          const isActive = currentTab === tabKey;

          return (
            <button
              key={tabKey}
              onClick={() => handleTabChange(tabKey)}
              style={{
                flex: 1,
                padding: "12px 0",
                border: "none",
                backgroundColor: isActive
                  ? colors.primary[600]
                  : colors.greenAccent[900],
                borderBottom: isActive
                  ? `1px solid ${colors.primary[100]}`
                  : "1px solid transparent",
                color: isActive ? colors.greenAccent[100] : colors.gray[500],
                fontWeight: isActive ? "bold" : "normal",
                cursor: "pointer",
                transition: "background-color 0.3s",
              }}
            >
              {labelMap[tabKey]}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div>
        {currentTab === "vendorRates" && (
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {reviews.vendorRates.map(({ id, user, stars }) => (
              <li
                key={id}
                style={{
                  border: `1px solid ${colors.primary[500]}`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  backgroundColor: colors.primary[600],
                }}
              >
                <strong>{user}</strong> rated:{" "}
                <span style={{ color: "#ffd700", fontSize: 20 }}>
                  {renderStars(stars)}
                </span>
              </li>
            ))}

            {reviews.vendorRates.length === 0 && (
              <p>No vendor rates found.</p>
            )}
          </ul>
        )}

        {(currentTab === "itemReviews" || currentTab === "vendorReviews") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {reviews[currentTab].map((review) => (
              <div
                key={review.id}
                style={{
                  border: `1px solid ${colors.primary[500]}`,
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: colors.primary[600],
                }}
              >
                {currentTab === "itemReviews" && (
                  <p style={{ fontWeight: "bold", marginBottom: 4 }}>
                    Item: {review.itemName}
                  </p>
                )}

                {currentTab === "vendorReviews" && (
                  <p style={{ fontWeight: "bold", marginBottom: 4 }}>
                    Vendor: {review.vendorName}
                  </p>
                )}

                <p
                  style={{
                    fontSize: 14,
                    color: colors.gray[200],
                    marginBottom: 4,
                  }}
                >
                  By: {review.user} — {review.date}
                </p>

                <p
                  style={{
                    color: "#ffd700",
                    fontWeight: "bold",
                    marginBottom: 8,
                    fontSize: 18,
                  }}
                >
                  {renderStars(review.rating)}
                </p>

                <p style={{ fontSize: 16 }}>{review.comment}</p>
              </div>
            ))}

            {reviews[currentTab].length === 0 && (
              <p>No reviews found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;