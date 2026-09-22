import React from "react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";

const ChartBox = ({ title, value, percentage, duration, link, chartData = [], percentageColor = "blue" }) => {
  const percentageClasses = {
    green: "text-green-600",
    blue: "text-[#2563eb]",
    red: "text-red-600",
    gold: "text-amber-600",
    gray: "text-[#595959]",
  };
  const percentageClass =
    percentageClasses[percentageColor] ||
    (percentageColor.includes("text-") ? percentageColor : "text-[#2563eb]");

  return (
    <div className="flex min-w-0 items-center justify-between gap-4">
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold uppercase tracking-wide text-[#595959]">{title}</p>
        <p className="mt-1 text-2xl font-bold tracking-tight text-[#222]">{value}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`text-xs font-bold ${percentageClass}`}>{percentage}</span>
          <span className="truncate text-[11px] text-[#777]">{duration}</span>
        </div>
        {link && (
          <Link to={link} className="mt-2 inline-flex text-xs font-semibold text-[#2563eb] hover:text-[#1d4ed8]">
            View all
          </Link>
        )}
      </div>
      <div className="h-20 w-[42%] min-w-[105px] max-w-[170px]">
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <Tooltip
                contentStyle={{ border: "1px solid #e6e6e4", borderRadius: 10, background: "#fff", fontSize: 11 }}
                labelStyle={{ display: "none" }}
              />
              <Line type="monotone" dataKey="pv" stroke="#2563eb" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-end text-[11px] text-[#999]">No trend data</div>
        )}
      </div>
    </div>
  );
};

export default ChartBox;
