import {
    Drawer,
    Box,
    Typography,
    Divider,
  } from "@mui/material";
  
  const SalesSummaryDrawer = ({ open, onClose, analytics }) => {
    return (
      <Drawer anchor="right" open={open} onClose={onClose}>
        <Box width={350} p={3}>
          
          <Typography variant="h5" fontWeight="bold">
            Sales Analytics Summary
          </Typography>
  
          <Divider sx={{ my: 2 }} />
  
          <Typography>
            💰 Total Revenue:
          </Typography>
          <Typography fontWeight="bold" color="green">
            KES {analytics.total_revenue?.toLocaleString()}
          </Typography>
  
          <Box mt={2} />
  
          <Typography>
            📦 Orders:
          </Typography>
          <Typography fontWeight="bold">
            {analytics.total_orders}
          </Typography>
  
          <Box mt={2} />
  
          <Typography>
            📈 Growth:
          </Typography>
          <Typography fontWeight="bold" color="blue">
            {analytics.growth}% this month
          </Typography>
  
          <Box mt={3}>
            <Typography variant="subtitle2">
              Best Selling Product
            </Typography>
            <Typography fontWeight="bold">
              {analytics.top_product}
            </Typography>
          </Box>
  
        </Box>
      </Drawer>
    );
  };
  
  export default SalesSummaryDrawer;