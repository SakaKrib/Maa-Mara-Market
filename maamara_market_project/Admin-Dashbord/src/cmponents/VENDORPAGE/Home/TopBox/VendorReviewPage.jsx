import React, { useState } from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";

const sampleReviews = {
  itemReviews: [
    {
      id: 1,
      itemName: "Handmade Wool Carpet",
      user: "Alice Johnson",
      rating: 4,
      comment: "Beautiful carpet, but shipping took a bit long.",
      date: "2025-11-15",
    },
    {
      id: 2,
      itemName: "Giraffe Lampshade",
      user: "Bob Smith",
      rating: 5,
      comment: "Amazing quality and fast delivery!",
      date: "2025-11-20",
    },
    {
      id: 3,
      itemName: "Ceramic Mug",
      user: "Emily Davis",
      rating: 3,
      comment: "Nice design but a little fragile.",
      date: "2025-11-25",
    },
  ],

  vendorReviews: [
    {
      id: 1,
      vendorName: "John Doe (MaaMara Market Vendor)",
      user: "Cathy Lee",
      rating: 5,
      comment: "Very responsive and good communication. Will buy again.",
      date: "2025-11-12",
    },
    {
      id: 2,
      vendorName: "John Doe (MaaMara Market Vendor)",
      user: "David Brown",
      rating: 3,
      comment: "Vendor was okay but packaging could be better.",
      date: "2025-11-18",
    },
    {
      id: 3,
      vendorName: "John Doe (MaaMara Market Vendor)",
      user: "Sarah Wilson",
      rating: 4,
      comment: "Great prices and timely delivery.",
      date: "2025-11-22",
    },
  ],

  vendorRates: [
    {
      id: 1,
      user: "Cathy Lee",
      stars: 5,
    },
    {
      id: 2,
      user: "David Brown",
      stars: 3,
    },
    {
      id: 3,
      user: "Sarah Wilson",
      stars: 4,
    },
    {
      id: 4,
      user: "Mark Taylor",
      stars: 2,
    },
  ],
};

const ReviewsPage = () => {
  const [currentTab, setCurrentTab] = useState("itemReviews");
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const handleTabChange = (tab) => {
    setCurrentTab(tab);
  };

  const renderStars = (count) =>
    "★".repeat(count) + "☆".repeat(5 - count);

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
          backgroundColor: colors.primary[400],
          boxShadow: `0 0 6px ${colors.primary[500]}`,
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
                backgroundColor: isActive ? colors.primary[500] : colors.primary[700],
                borderBottom: isActive ? `1px solid ${colors.primary[100]}` : "1px solid transparent",
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
            {sampleReviews.vendorRates.map(({ id, user, stars }) => (
              <li
                key={id}
                style={{
                  border: `1px solid ${colors.primary[500]}`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                  backgroundColor: colors.primary[700],
                  
                }}
                className="shadow"
              >
                <strong>{user}</strong> rated:{" "}
                <span style={{ color: "#ffd700", fontSize: 20 }}>
                  {renderStars(stars)}
                </span>
              </li>
            ))}
            {sampleReviews.vendorRates.length === 0 && (
              <p>No vendor rates found.</p>
            )}
          </ul>
        )}

        {(currentTab === "itemReviews" || currentTab === "vendorReviews") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {sampleReviews[currentTab].map((review) => (
              <div
                key={review.id}
                style={{
                  border: `1px solid ${colors.primary[500]}`,
                  borderRadius: 8,
                  padding: 16,
                  backgroundColor: colors.primary[700],
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

            {sampleReviews[currentTab].length === 0 && (
              <p>No reviews found.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
