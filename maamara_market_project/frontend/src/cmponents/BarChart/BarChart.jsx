import { ResponsiveBar } from "@nivo/bar";
import "../admin-charts.css";
import { formatAxisNumber } from "../../Services/formatNumber";

const BarChart = ({ data = [] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="mm-admin-chart-empty">No sales data available yet.</div>;
  }

  return (
    <div className="mm-admin-chart-fill">
      <ResponsiveBar
        data={data}
        keys={["sales"]}
        indexBy="label"
        margin={{ top: 18, right: 18, bottom: 48, left: 58 }}
        padding={0.35}
        enableLabel={false}
        enableGridY
        axisBottom={{ tickSize: 0, tickPadding: 8, legend: "Period", legendPosition: "middle", legendOffset: 38 }}
        axisLeft={{ tickSize: 0, tickPadding: 6, format: formatAxisNumber, legend: "Sales (KES)", legendPosition: "middle", legendOffset: -48 }}
        legends={[]}
        theme={{
          axis: {
            domain: { line: { stroke: "var(--mm-border, #e5e7eb)" } },
            ticks: { text: { fill: "var(--mm-muted, #6b7280)", fontSize: 10 } },
            legend: { text: { fill: "var(--mm-muted, #6b7280)", fontSize: 10 } },
          },
          grid: { line: { stroke: "var(--mm-border, #e5e7eb)", strokeWidth: 1 } },
          labels: { text: { fill: "var(--mm-foreground, #1f2937)" } },
        }}
        colors={{ scheme: "paired" }}
        role="img"
        ariaLabel="Admin sales activity bar chart"
        tooltip={({ indexValue, value, data: point }) => (
          <div className="mm-admin-chart-tooltip">
            <div className="mm-admin-chart-tooltip-title">{indexValue}</div>
            <div className="mm-admin-chart-tooltip-muted">KES {Number(value || 0).toLocaleString()}</div>
            <div className="mm-admin-chart-tooltip-muted">{Number(point?.orders || 0).toLocaleString()} orders</div>
          </div>
        )}
      />
    </div>
  );
};

export default BarChart;
