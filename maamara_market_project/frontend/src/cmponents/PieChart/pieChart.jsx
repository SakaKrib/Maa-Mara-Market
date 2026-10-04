import { ResponsivePie } from "@nivo/pie";

const PieGraph = ({ data = [] }) => {
  if (!Array.isArray(data) || data.length === 0) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No category data available yet.</div>;
  }

  return (
    <div className="h-full min-h-0 w-full">
      <ResponsivePie
        data={data}
        margin={{ top: 18, right: 18, bottom: 70, left: 18 }}
        innerRadius={0.5}
        padAngle={0.6}
        cornerRadius={3}
        activeOuterRadiusOffset={5}
        arcLinkLabelsSkipAngle={12}
        arcLinkLabelsTextColor="hsl(var(--muted-foreground))"
        arcLinkLabelsThickness={1}
        arcLinkLabelsColor={{ from: "color" }}
        arcLabelsSkipAngle={12}
        arcLabelsTextColor={{ from: "color", modifiers: [["darker", 2]] }}
        colors={{ scheme: "paired" }}
        theme={{
          legends: { text: { fill: "hsl(var(--muted-foreground))", fontSize: 10 } },
          labels: { text: { fill: "hsl(var(--foreground))", fontSize: 10 } },
        }}
        legends={[{
          anchor: "bottom",
          direction: "row",
          translateY: 62,
          itemWidth: 85,
          itemHeight: 18,
          symbolShape: "circle",
          itemTextColor: "hsl(var(--muted-foreground))",
        }]}
        role="img"
        ariaLabel="Admin category distribution pie chart"
      />
    </div>
  );
};

export default PieGraph;
