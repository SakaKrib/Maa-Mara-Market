import React, { useState } from "react";
import MonthlyReport from "./Reports/ReportsLedger";
import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import useDashboardData from "../../Hooks/AccountSummary/AccountSummaryHook";

/**
 * PaymentsOverview
 * Props:
 *  - date (string) optional ISO date value for the date input
 *  - cards (array) optional list of card-like payment items:
 *      [{ id, provider, balanceText, holderName, meta1Label, meta1Value, meta2Label, meta2Value }]
 */

export default function PaymentsOverview({ date = "", cards = null }) {
  // date filter state
  const [selectedDate, setSelectedDate] = useState(date);

  // fetch data based on selectedDate
  const { data, loading, error } = useDashboardData(selectedDate);

  // Get amounts safely
  const paypal_total = data.accounts?.paypal?.amount || 0;
  const mpesa_total = data.accounts?.mpesa?.amount || 0;

  // Format totals with commas
  const formattedPaypalTotal = Number(paypal_total).toLocaleString();
  const formattedMpesaTotal = Number(mpesa_total).toLocaleString();

  const defaultCards = [
    {
      id: "paypal",
      provider: "PayPal",
      balanceText: `KES ${formattedPaypalTotal}`,
      holderName: data.accounts?.paypal?.holder || "Maa Mara Market",
      meta1Label: "Account",
      meta1Value: data.accounts?.paypal?.account || "merchant@paypal.example",
      meta2Label: "Status",
      meta2Value: data.accounts?.paypal?.status || "Verified",
    },
    {
      id: "mpesa",
      provider: "M-Pesa",
      balanceText: `KES ${formattedMpesaTotal}`,
      holderName: data.accounts?.mpesa?.holder || "Maa Mara Market",
      meta1Label: "Till",
      meta1Value: data.accounts?.mpesa?.till || "123456",
      meta2Label: "Agent",
      meta2Value: data.accounts?.mpesa?.agent_status || "Active",
    },
  ];

  const items = cards || defaultCards;

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (loading) return <p style={{ color: colors.gray[100] }}>Loading...</p>;
  if (error) return <p style={{ color: colors.redAccent[500] }}>Error loading data</p>;

  // Handle date change
  const handleDateChange = (e) => {
    setSelectedDate(e.target.value);
    // No refetch here because useDashboardData fetches automatically on selectedDate change
  };

  return (
    <section className="middle p-6 mb-6">
      <div className="heading flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold" style={{ color: colors.blueAccent[100] }}>
          Overview
        </h1>
        <input
          type="date"
          value={selectedDate}
          onChange={handleDateChange}
          className="px-3 py-2 border rounded-md"
          style={{ backgroundColor: colors.gray[300] }}
        />
      </div>

      <div className="debit-cards grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
        {items.map((c) => (
          <div
            key={c.id}
            className="card bg-white shadow-md rounded-lg overflow-hidden"
            style={{ color: colors.gray[100], backgroundColor: colors.gray[600] }}
          >
            <div className="top flex items-center justify-between px-6 py-4 border-b">
              <div className="left flex items-center gap-3">
                <ProviderIcon provider={c.provider} />
                <h2 className="text-lg font-semibold" style={{ color: colors.gray[100] }}>
                  {c.provider}
                </h2>
              </div>
              <div className="right text-right">
                <span className="text-sm text-gray-500" style={{ color: colors.gray[100] }}>
                  {c.meta1Label}
                </span>
                <div className="text-sm font-medium" style={{ color: colors.gray[100] }}>
                  {c.meta1Value}
                </div>
              </div>
            </div>

            <div className="middle-content px-6 py-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold">{c.balanceText}</h2>
              <div className="chip hidden sm:block">
                <svg
                  width="48"
                  height="32"
                  viewBox="0 0 48 32"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <rect x="0" y="0" width="48" height="32" rx="4" fill="#E9E9E9" />
                  <rect x="6" y="6" width="36" height="20" rx="3" fill={colors.primary[600]} />
                </svg>
              </div>
            </div>

            <div className="bottom px-6 py-4 flex items-center justify-between border-t">
              <div className="left">
                <small className="text-xs" style={{ color: colors.gray[100] }}>
                  Account / Holder
                </small>
                <h5 className="text-sm font-medium mt-1">{c.holderName}</h5>
              </div>

              <div className="right text-right">
                <div className="expiry">
                  <small className="text-xs" style={{ color: colors.gray[100] }}>
                    {c.meta1Label}
                  </small>
                  <h5 className="text-sm font-medium mt-1">{c.meta1Value}</h5>
                </div>

                <div className="cvv mt-2">
                  <small className="text-xs" style={{ color: colors.gray[100] }}>
                    {c.meta2Label}
                  </small>
                  <h5 className="text-sm font-medium mt-1">{c.meta2Value}</h5>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      <MonthlyReport />
    </section>
  );
}

/** small icon component for providers (inline SVGs) */
function ProviderIcon({ provider }) {
  const name = (provider || "").toLowerCase();
  if (name.includes("paypal")) {
    return (
      <svg
        width="48"
        height="28"
        viewBox="0 0 48 28"
        fill="none"
        className="provider-icon"
      >
        <rect width="48" height="28" rx="6" fill="#003087" />
        <text
          x="8"
          y="18"
          fill="#FFD700"
          fontWeight="700"
          fontSize="10"
        >
          PayPal
        </text>
      </svg>
    );
  }
  if (name.includes("m-pesa") || name.includes("mpesa")) {
    return (
      <svg
        width="48"
        height="28"
        viewBox="0 0 48 28"
        fill="none"
        className="provider-icon"
      >
        <rect width="48" height="28" rx="6" fill="#009639" />
        <text
          x="6"
          y="18"
          fill="#fff"
          fontWeight="700"
          fontSize="10"
        >
          M-Pesa
        </text>
      </svg>
    );
  }
  // fallback generic icon
  return (
    <svg
      width="48"
      height="28"
      viewBox="0 0 48 28"
      fill="none"
      className="provider-icon"
    >
      <rect width="48" height="28" rx="6" fill="#6B7280" />
      <text x="10" y="18" fill="#fff" fontWeight="700" fontSize="10">
        PAY
      </text>
    </svg>
  );
}
