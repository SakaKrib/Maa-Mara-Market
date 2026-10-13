import { ResponsivePie } from "@nivo/pie";
import "../admin-charts.css";

const PieGraph = ({ data = [] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="mm-admin-chart-empty">No category data available yet.</div>;
  }

  return (
    <div className="mm-admin-chart-fill">
      <ResponsivePie
        data={data}
        margin={{ top: 18, right: 18, bottom: 70, left: 18 }}
        innerRadius={0.5}
        padAngle={0.6}
        cornerRadius={3}
        activeOuterRadiusOffset={5}
        arcLinkLabelsSkipAngle={12}
        arcLinkLabelsTextColor="var(--mm-muted, #6b7280)"
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={12}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
        colors={{ scheme: "paired" }}
        theme={{
          legends: { text: { fill: "var(--mm-muted, #6b7280)", fontSize: 10 } },
          labels: { text: { fill: "var(--mm-foreground, #1f2937)", fontSize: 10 } },
        }}
        legends={[{
          anchor: "bottom",
          direction: "row",
          translateY: 62,
          itemWidth: 85,
          itemHeight: 18,
          symbolShape: "circle",
          itemTextColor: "var(--mm-muted, #6b7280)",
        }]}
        role="img"
        ariaLabel="Admin category distribution pie chart"
      />
    </div>
  );
};

export default PieGraph;
