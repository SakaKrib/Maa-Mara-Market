import { useTheme } from '@mui/material';
import { ResponsivePie } from '@nivo/pie';
import { tokens } from '../../theme';
import { Vendor_info } from '../../data/Vendors_info/Vendors_info';

const pieData = Vendor_info.map((vendor) => ({
  id: vendor.Name,
  label: vendor.Name,
  value: vendor.registrationId,
}));

const PieGraph = (isDashboard = false) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  if (!Array.isArray(pieData) || pieData.length === 0) {
    return <div>No chart data available</div>;
  }

  return (
    <div style={{ height: '30vh', width: '100%' }}>
      <ResponsivePie
        data={pieData}
        margin={{ top: 40, right: 80, bottom: 80, left: 80 }}
        innerRadius={0.5}
        padAngle={0.6}
        cornerRadius={2}
        activeOuterRadiusOffset={8}
        arcLinkLabelsSkipAngle={10}
        arcLinkLabelsTextColor={colors.gray[100]}
        arcLinkLabelsThickness={2}
        arcLinkLabelsColor={{ from: 'color' }}
        arcLabelsSkipAngle={10}
        arcLabelsTextColor={{ from: 'color', modifiers: [['darker', 5]] }}
        colors={{ scheme: 'paired' }} // 🔧 Customize or use theme-based colors
        theme={{
          legends: {
            text: {
              fill: colors.primary[100],
              
            },
          },
          labels: {
            text: {
              fill: colors.gray[100],
            },
          },
        }}
        legends={[
          {
            anchor: 'bottom',
            direction: 'row',
            translateY: 56,
            itemWidth: 100,
            itemHeight: 18,
            symbolShape: 'circle',
            itemTextColor: colors.primary[100],
          },
        ]}
      />
    </div>
  );
};

export default PieGraph;
