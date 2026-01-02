import React from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Props:
 * - monthlySummary: array of {month: "YYYY-MM", income: number, expenses: number, cashbook: number}
 */
export default function CryptoChart({ monthlySummary = [] }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  console.log("this is montly summery", monthlySummary)

  // Prepare labels and datasets dynamically from monthlySummary
  // If monthlySummary is empty, fallback to default labels and empty data
  const labels = monthlySummary.length
    ? monthlySummary.map((item) => item.month)
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  const incomeData = monthlySummary.length
    ? monthlySummary.map((item) => item.income)
    : Array(12).fill(0);
    console.log("incomedata", incomeData)

  const expensesData = monthlySummary.length
    ? monthlySummary.map((item) => item.expenses)
    : Array(12).fill(0);

  const data = {
    labels,
    datasets: [
      {
        label: 'Income',
        data: incomeData,
        borderColor: colors.greenAccent[500] || 'green',
        borderWidth: 2,
        fill: false,
      },
      {
        label: 'Expenses',
        data: expensesData,
        borderColor: colors.redAccent[500] || 'red',
        borderWidth: 2,
        fill: false,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: colors.gray[100],
        },
      },
      title: {
        display: true,
        text: 'Monthly Income & Expenses',
        color: colors.blueAccent[100],
        font: {
          size: 18,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: colors.blueAccent[100],
        },
        grid: {
          color: colors.gray[300],
        },
      },
      y: {
        ticks: {
          color: colors.blueAccent[100],
        },
        grid: {
          color: colors.blueAccent[300],
        },
      },
    },
  };

  return (
    <div className="p-4 lg:w-full" style={{ height: 400 }}>
      <Line
        data={data}
        options={options}
        className="p-4 rounded-md lg:w-full"
        style={{ backgroundColor: colors.tealAccent[900] }}
      />
    </div>
  );
}
