// src/components/BarChart/BarChart.jsx

import { useTheme } from '@mui/material';
import { ResponsiveBar } from '@nivo/bar';
import { tokens } from '../../theme';
import { Vendor_info as data } from '../../data/Vendors_info/Vendors_info';

// ✅ Rename mock data to avoid naming conflict with props
console.log(data)

const BarChart = (isDashboard = false) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // 🛡️ Optional safeguard
  if (!Array.isArray(data) || data.length === 0) {
    return <div>No chart data available.</div>;
  }

  return (
    <div style={{ height: '36vh', width: '100%' }}>
      <ResponsiveBar
        data={data}
        keys={["Id", "Age", "registrationId"]}
        indexBy="Id"
        margin={{ top: 50, right: 130, bottom: 50, left: 60 }}
        padding={0.3}
        enableLabel={true}
        labelSkipWidth={12}
        labelSkipHeight={16}
        enableGridY={false}
        axisBottom={{
          legend: "Name",
          legendPosition: "left",
          legendOffset: 32,
        }}
        axisLeft={{
          legend: "registrationId",
          legendPosition: "middle",
          legendOffset: -40,
        }}
        legends={[
          {
            dataFrom: "keys",
            anchor: "bottom-right",
            direction: "column",
            translateX: 120,
            itemWidth: 100,
            itemHeight: 10,
            itemsSpacing: 3,
            symbolSize: 20,
          },
        ]}
        theme={{
          axis: {
            domain: {
              line: {
                stroke: colors.gray[100],
              },
            },
            legend: {
              text: {
                fill: colors.primary[100],
              },
            },
            ticks: {
              line: {
                stroke: colors.gray[100],
                strokeWidth: 1,
              },
              text: {
                fill: colors.gray[100],
              },
            },
          },
          legends: {
            text: {
              fill: colors.primary[100],
            },
          },
        }}
      />
    </div>
  );
};

export default BarChart;
