import { useTheme } from '@mui/material';
import React from 'react';
import {
  ComposedChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { tokens } from '../../../../theme';
import { useVendorPayoutHistory } from '../../../Hooks/Payouts/Payouts'; // adjust path
import { color } from 'framer-motion';

const VendorBar = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const { payouts, loading, error } = useVendorPayoutHistory();

  const groupedData = React.useMemo(() => {
    if (!payouts || payouts.length === 0) return [];
  
    // Group payouts by month (monthKey will be a Date object set to the 1st of the month)
    const grouped = payouts.reduce((acc, item) => {
      if (!item.payout_period_start) return acc;
  
      const payoutDate = new Date(item.payout_period_start);
      // normalize date to 1st day of the month for grouping
      const monthDate = new Date(payoutDate.getFullYear(), payoutDate.getMonth(), 1);
  
      const monthKey = monthDate.toISOString(); // unique string for month
  
      if (!acc[monthKey]) acc[monthKey] = 0;
      acc[monthKey] += parseFloat(item.amount) || 0;
  
      return acc;
    }, {});
  
    // Convert grouped object into array and format month name
    const result = Object.entries(grouped)
      .map(([monthISO, payoutAmount]) => {
        const date = new Date(monthISO);
        return {
          name: date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
          payoutAmount,
          date, // keep date for sorting
        };
      })
      // sort by date ascending (oldest first)
      .sort((a, b) => a.date - b.date);
  
    return result;
  }, [payouts]);
  

  if (loading) {
    return <div className='text-sm' style={{ color: colors.greenAccent[500] }}>Loading payouts...</div>;
  }

  if (error) {
    return (
      <div style={{ color: colors.redAccent[500] }}>
        Error: {typeof error === 'string' ? error : JSON.stringify(error)}
      </div>
    );
  }

  return (
    <div
      style={{
        width: '100%',
        height: '500px',
        backgroundColor: colors.primary[500],
        padding: 0,
      }}
    >
      <ResponsiveContainer>
        <ComposedChart data={groupedData} margin={{ top: 50, right: 0, bottom: 20, left: 0 }}>
          <CartesianGrid strokeDasharray="0.4 5" />
          <XAxis
            dataKey="name"
            label={{ value: 'Payout Period', position: 'insideBottomCenter', offset: 5, dy: 15, style:{fill:colors.gray[100], fontSize: 15} }}
            scale="band"
            tick={{ fontSize: 12 }}
          />
          <YAxis 
           tick={{ fontSize: 12 }}
          />
          <Tooltip
          contentStyle={{
          backgroundColor: colors.primary[400], 
          color: colors.gray[100],              
          borderRadius: '8px',
          border: 'none',
          fontSize: 15
        }}
        itemStyle={{
          color: colors.greenAccent[400],
        }}
        labelStyle={{
          color: colors.gray[200],              
        }}
      />

        
          <Area type="monotone" dataKey="payoutAmount" fill={colors.redAccent[900]} stroke="transparent" />
          <Bar dataKey="payoutAmount" barSize={20} fill={colors.greenAccent[600]} />
          <Line type="monotone" dataKey="payoutAmount" stroke="#ff7300" />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

export default VendorBar;
