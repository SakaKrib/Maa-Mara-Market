import React from "react";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import useDashboardData from "../../../Hooks/AccountSummary/AccountSummaryHook";

export default function MonthlyReport() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { data, loading, error } = useDashboardData();

  if (loading) {
    return <p style={{ color: colors.gray[100] }}>Loading...</p>;
  }

  if (error) {
    return <p style={{ color: colors.redAccent[500] }}>Error loading data</p>;
  }

  // Extract values from the hook state (summary, payments)
  const incomeAmount = data.summary?.income?.amount || 0;
  const incomeComparison = data.summary?.income?.comparison || "";

  const expensesAmount = data.summary?.expenses?.amount || 0;
  const expensesComparison = data.summary?.expenses?.comparison || "";

  const cashbookAmount = data.summary?.cashbook?.amount || 0;
  const cashbookComparison = data.summary?.cashbook?.comparison || "";

  const paymentsForVendors = data.payments?.Vendors || 0;

  // Format KES currency
  const formatKES = (num) =>
    Number(num).toLocaleString("en-KE", { minimumFractionDigits: 2 });

  return (
    <div className="monthly-report flex justify-center">
      <div className="report" style={{ backgroundColor: colors.primary[600] }}>
        <h2 style={{ color: colors.blueAccent[100] }}>Income</h2>
        <details>
          <h2>KES {formatKES(incomeAmount)}</h2>
          <h5 className="success" style={{ backgroundColor: colors.gray[700] }}>{incomeComparison}</h5>
        </details>
        <p className="text-muted">compared to last month</p>
      </div>

      <div className="report" style={{ backgroundColor: colors.primary[600] }}>
        <h2 style={{ color: colors.blueAccent[100] }}>Expenses</h2>
        <details>
          <h2>KES {formatKES(expensesAmount)}</h2>
          <h5 className="warning" style={{ backgroundColor: colors.gray[700] }}>{expensesComparison}</h5>
        </details>
        <p className="text-muted">compared to last month</p>
      </div>

      <div className="report" style={{ backgroundColor: colors.primary[600] }}>
        <h2 style={{ color: colors.blueAccent[100] }}>Cashbook</h2>
        <details>
          <h2>KES {formatKES(cashbookAmount)}</h2>
          <h5 className="danger" style={{ backgroundColor: colors.gray[700] }}>{cashbookComparison}</h5>
        </details>
        <p className="text-muted">compared to last month</p>
      </div>

      <div className="report" style={{ backgroundColor: colors.primary[600] }}>
        <h2 style={{ color: colors.blueAccent[100] }}>Payments for Vendors</h2>
        <details>
          <h2>KES {formatKES(paymentsForVendors)}</h2>
          <h5 className="info" style={{ backgroundColor: colors.gray[700] }}>Payments for this month</h5>
        </details>
        <p className="text-muted">vendor salary</p>

      </div>
    </div>
  );
}
