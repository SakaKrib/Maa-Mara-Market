import { ResponsiveBar } from "@nivo/bar";

const BarChart = ({ data = [] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No sales data available yet.</div>;
  }

  return (
    <div className="h-full min-h-0 w-full">
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
          <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-md">
            <div className="font-semibold">{indexValue}</div>
            <div className="text-muted-foreground">KES {Number(value || 0).toLocaleString()}</div>
            <div className="text-muted-foreground">{Number(point?.orders || 0).toLocaleString()} orders</div>
          </div>
        )}
      />
    </div>
  );
};

export default BarChart;
