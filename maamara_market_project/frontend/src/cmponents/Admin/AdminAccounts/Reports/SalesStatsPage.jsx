import { useEffect, useState } from "react";
import { Box, Typography, useTheme, Button } from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import api from "../../../../Services/Api";
import { tokens } from "../../../../theme";
import StatBox from "../../../StatBox/Statbox";
import useDashboardStats from "../../../Hooks/StockInventory/SalesStats";
import PointOfSaleIcon from "@mui/icons-material/PointOfSale";
import { color } from "framer-motion";
import { useNavigate } from "react-router-dom"; 


const SalesPage = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [rows, setRows] = useState([]);

  const { stats, loading } = useDashboardStats();
  const navigate = useNavigate()

 

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/api/admin/dashboard/vendor-sales/");

        // FLATTEN DATA FOR DATAGRID
        const formatted = res.data.flatMap((vendor) =>
          vendor.items.map((item, index) => ({
            id: `${vendor.vendor_name}-${index}`,
            vendor: vendor.vendor_name,
            item: item.item_name,
            qty_sold: item.qty_sold,
            total_qty: item.total_qty,
            remaining: item.total_qty - item.qty_sold,
          }))
        );

        setRows(formatted);
      } catch (err) {
        console.log(err);
      }
    };

    fetchData();
  }, []);

  const columns = [
    {
      field: "vendor",
      headerName: "Vendor",
      flex: 1,
    },
    {
      field: "item",
      headerName: "Item",
      flex: 1,
    },
    {
      field: "qty_sold",
      headerName: "Qty Sold",
      flex: 1,
      type: "number",
    },
    {
      field: "total_qty",
      headerName: "Total Stock",
      flex: 1,
      type: "number",
    },
    {
      field: "remaining",
      headerName: "Remaining",
      flex: 1,
      type: "number",
    },
  ];

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <Box p={3}>
      <Typography variant="h3" mb={3} sx={{color:colors.gray[100]}}>
        Vendor Sales
      </Typography>

      <Box sx={{mt:'10px', mb:'10px'}}> 
        <Typography variant="h5" sx={{color:colors.gray[100], mb:'10px'}}> Stats Analysis</Typography>
      <Box
      bgcolor={colors.primary[600]}
      p={2}
      borderRadius="0.5em"
      display="flex"
      sx={{
        cursor: "pointer",
        transition: "0.3s",
        "&:hover": {
          opacity: 0.9,
          transform: "translateY(-2px)",
        },
      }}
    >
      <StatBox
        title={`${Number(stats.total_sales).toLocaleString()}`}
        subtitle="Sales"
        progress={
          stats.total_orders > 0
            ? stats.completed_orders / stats.total_orders
            : 0
        }
        increase={`${stats.total_orders} Orders`}
        icon={
          <PointOfSaleIcon
            sx={{
              color: colors.greenAccent[600],
              fontSize: 24,
            }}
          />
        }
      />
    </Box>
    <Box sx={{ mt: 2, display: "flex", justifyContent: "flex-end" }}>
      <Button
        variant="contained"
        onClick={() => navigate("transaction-growth-track")}
        sx={{
          backgroundColor: colors.greenAccent[600],
          color: "#fff",
          fontWeight: "bold",
          textTransform: "none",
          px: 2,
          py: 1,
          borderRadius: "8px",
          "&:hover": {
            backgroundColor: colors.greenAccent[700],
          },
        }}
      >
        View Revenue Growth
      </Button>
    </Box>
      </Box>

      <Box
        sx={{
          height: "75vh",
          width: "100%",
          mt:'30px',
          "& .MuiDataGrid-root": {
            border: "none",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "none",
          },
          "& .MuiDataGrid-columnHeaders": {
            backgroundColor: colors.primary[700],
            color: colors.gray[100],
            borderTop: `1px solid ${colors.gray[100]}`,
          },
          "& .MuiDataGrid-virtualScroller": {
            backgroundColor: colors.primary[600],
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "none",
            backgroundColor: colors.primary[700],
          },
        }}
      >
          <Typography variant="h5" sx={{color:colors.gray[100], mb:'10px'}}> Sales</Typography>
        <DataGrid rows={rows} columns={columns} />
      </Box>
    </Box>
  );
};

export default SalesPage;