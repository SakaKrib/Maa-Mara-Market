import React from "react";
import { Line } from "react-chartjs-2";
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function CryptoChart({ monthlySummary = [] }) {
  const labels = monthlySummary.length ? monthlySummary.map((item) => item.month) : ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const incomeData = monthlySummary.length ? monthlySummary.map((item) => Number(item.income || 0)) : Array(12).fill(0);
  const expensesData = monthlySummary.length ? monthlySummary.map((item) => Number(item.expenses || 0)) : Array(12).fill(0);

  const data = {
    labels,
    datasets: [
      { label: "Income", data: incomeData, borderWidth: 2, tension: 0.35, fill: false },
      { label: "Expenses", data: expensesData, borderWidth: 2, tension: 0.35, fill: false },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: true, text: "Monthly Income & Expenses", font: { size: 16 } },
    },
    scales: {
      x: { ticks: { maxRotation: 45, minRotation: 0 } },
      y: { beginAtZero: true },
    },
  };

  return (
    <section className="mt-5 rounded-2xl border border-border bg-card p-3 shadow-custom sm:p-5">
      <div className="h-[300px] min-w-0 sm:h-[380px]">
        <Line data={data} options={options} />
      </div>
    </section>
  );
}
