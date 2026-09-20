import { ResponsiveBar } from "@nivo/bar";
import { Vendor_info as data } from "../../data/Vendors_info/Vendors_info";

const BarChart = () => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No chart data available.</div>;
  }

  return (
    <div className="h-full min-h-0 w-full">
      <ResponsiveBar
        data={data}
        keys={["Id", "Age", "registrationId"]}
        indexBy="Id"
        margin={{ top: 18, right: 18, bottom: 48, left: 48 }}
        padding={0.35}
        enableLabel={false}
        enableGridY
        axisBottom={{ tickSize: 0, tickPadding: 8, legend: "Name", legendPosition: "middle", legendOffset: 38 }}
        axisLeft={{ tickSize: 0, tickPadding: 6, legend: "Registration", legendPosition: "middle", legendOffset: -38 }}
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
      />
    </div>
  );
};

export default BarChart;
