import { ResponsiveBar } from "@nivo/bar";
import "../admin-charts.css";

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
        axisLeft={{ tickSize: 0, tickPadding: 6, legend: "Sales (KES)", legendPosition: "middle", legendOffset: -48 }}
        legends={[]}
        theme={{
          axis: {
            domain: { line: { stroke: "hsl(var(--border))" } },
            ticks: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } },
            legend: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } },
          },
          grid: { line: { stroke: "hsl(var(--border))", strokeWidth: 1 } },
          labels: { text: { fill: "hsl(var(--foreground))" } },
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
