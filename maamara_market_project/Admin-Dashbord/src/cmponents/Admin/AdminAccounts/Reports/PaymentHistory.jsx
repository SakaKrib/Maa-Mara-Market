import React, { useState } from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import { IonIcon } from "@ionic/react";
import { addCircleOutline } from "ionicons/icons";
import useDashboardSummary from "../../../Hooks/AccountSummary/AccountSummaryHook";
import AddPaymentModal from "./AddPaymentModal";
import api from "../../../../Services/Api";

export default function FastPayment() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // handle add payment modal state
  const [openModal, setOpenModal] = useState(false);

  const { data, loading, error, refetch } = useDashboardSummary();

  if (loading) return <p>Loading...</p>;
  if (error || !data)
    return (
      <p style={{ color: colors.redAccent[500], padding: "10px 20px" }}>
        Error loading payments.
      </p>
    );

  const payments = data?.payments || {};

  // Debug: Log payments object to confirm structure and keys
  console.log("Payments from API:", data);

  const badgeColors = {
    Vendors: "#4caf5",
    Staffs: "#f44336",
    "KRA Licenses": "#ff9800",
    Refund: "#4caf50",
    Training: "#4caf50",
    Subscriptions: "#f44336",
    Rent: "#ff9800",
  };

  // add payment API call
  const handleAddPayment = async (form) => {
    try {
      await api.post("/api/transactions/", form);
      await refetch(true);
    } catch (err) {
      console.error("Failed to add payment", err);
    }
  };

  return (
    <div className="fast-payment p-4 mb-4">
      <h2 className="text-xl" style={{ color: colors.gray[100] }}>
        Payments Summary
      </h2>

      <div
        className="badges w-full"
        style={{ display: "flex", gap: 12, flexWrap: "wrap" }}
      >
        {/* ADD NEW TRANSACTION BUTTON */}
        <div
          onClick={() => setOpenModal(true)}
          style={{
            backgroundColor: colors.primary[600],
            width: 52,
            height: 52,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: 10,
            cursor: "pointer",
          }}
        >
          <IonIcon
            icon={addCircleOutline}
            style={{ color: colors.greenAccent[500], fontSize: 32 }}
          />
        </div>

        {/* PAYMENTS */}
        {Object.entries(payments).map(([title, amount]) => {
          // Debug log each badge render to confirm values
          console.log("Rendering badge:", title, amount);

          // Ensure amount is a number and > 0
          const numericAmount = Number(amount);
          if (isNaN(numericAmount) || numericAmount <= 0) return null;

          return (
            <div
              key={title}
              className="badge shadow-custom items-center"
              style={{
                backgroundColor: colors.primary[600],
                padding: "12px",
                borderRadius: 10,
                minWidth: 150,
                // border: `1px solid ${colors.greenAccent[500]}`, 
                color: colors.gray[100],
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    backgroundColor: badgeColors[title] || "#999",
                  }}
                />
                <h5>{title}</h5>
              </div>

              <h4
                className="text-sm flex items-center"
                style={{ color: colors.blueAccent[100], marginTop: 6 }}
              >
                KES {numericAmount.toLocaleString()}
              </h4>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      <AddPaymentModal
        open={openModal}
        onClose={() => setOpenModal(false)}
        onSubmit={handleAddPayment}
      />
    </div>
  );
}
