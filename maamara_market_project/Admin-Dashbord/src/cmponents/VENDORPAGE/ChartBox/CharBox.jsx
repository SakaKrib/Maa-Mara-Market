

import React from "react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import "./CharBox.css"; // Optional: your styles

const ChartBox = ({ title, value, percentage, duration, link, chartData, percentageColor }) => {
  return (
    <div className="chartbox">
      <div className="boxInfo">
        <div className="title">
          <span className="text-sm font-bold leading-5 text-[#222]">{title}</span>
        </div>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[#222] sm:text-[28px]">{value}</h1>
        <Link to={link} className="mt-1 text-xs font-semibold text-[#2563eb] transition hover:text-[#1d4ed8]">View all</Link>
      </div>

      <div className="chartInfo">
        <div className="chart">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart width={300} height={100} data={chartData}>
              <Tooltip
                contentStyle={{ background: "transparent", border: "none" }}
                labelStyle={{ display: "none" }}
              />
              <Line
                type="monotone"
                dataKey="pv"
                stroke={percentageColor}
                strokeWidth={2}
                dot={true}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="texts">
          <span className={`percentage ${percentageColor} text-sm font-bold`}>{percentage}</span>
          <span className="duration text-xs text-[#595959]">{duration}</span>
        </div>
      </div>
    </div>
  );
};

export default ChartBox;
