

import React from "react";
import { LineChart, Line, Tooltip, ResponsiveContainer } from "recharts";
import { Link } from "react-router-dom";
import "./CharBox.css"; // Optional: your styles

const ChartBox = ({ title, value, percentage, duration, link, chartData, percentageColor }) => {
  return (
    <div className="chartbox">
      <div className="boxInfo">
        <div className="title">
          <span>{title}</span>
        </div>
        <h1>{value}</h1>
        <Link to={link}>View all</Link>
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
          <span className={`percentage ${percentageColor}`}>{percentage}</span>
          <span className="duration">{duration}</span>
        </div>
      </div>
    </div>
  );
};

export default ChartBox;
