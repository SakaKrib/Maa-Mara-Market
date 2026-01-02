import {
  Box,
  useTheme,
  Card,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import { tokens } from "../../theme";
import Header from "../../Header/Header";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/DeleteOutlined";
import EditIcon from "@mui/icons-material/EditOutlined";
import ViewIcon from "@mui/icons-material/ViewModuleOutlined";
import "./Vendor.css";
import { useAuth } from "../Auth/AuthContext/Context";
import { baseUrl } from "../Constant/Constant";
import { useCsrfToken } from "../Hooks/AccessCRF/UseCSRFToken";
import api from "../../Services/Api";
import EditItem from "../VENDORPAGE/Products/Forms/EditItem/EditItem";

const Vendor_list = () => {
  const [vendors, setVendors] = useState([]);
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const { isAuthenticated, loading } = useAuth();
  const csrfToken = useCsrfToken();

  useEffect(() => {
    if (!isAuthenticated || loading) return;
  
    api
      .get(`${baseUrl}/api/vendors/`, {
        headers: { "X-CSRFToken": csrfToken },
        withCredentials: true,
      })
      .then((response) => {
        console.log(response.data); // ✅ should show {count, next, previous, results: [...]}
  
        const formattedData = (response.data.results || []).map((vendor) => ({
          id: vendor.id,
          // use correct fields from your API
          name: vendor.first_name || vendor.surname_name || "N/A",
          email: vendor.email || "N/A",
          image: vendor.profile_picture_url,
          company: vendor.company_name || "",
          payment_method: vendor.payment_method || "",
          product: vendor.product_type || "",
          phone: vendor.phone_number || "",
          workshop: vendor.workshop_location || "",
          items: vendor.items || [],
        }));
  
        setVendors(formattedData);
      })
      .catch((error) => {
        console.error("Error fetching vendors:", error);
      });
  }, [isAuthenticated, loading]);
  

  if (loading) return <div>Loading authentication status...</div>;
  if (!isAuthenticated) return <div>Access denied. Please log in.</div>;

  const columns = [
    { field: "id", headerName: "ID", minWidth: 60 },
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      cellClassName: "name-column--cell",
    },
    {
      field: "image",
      headerName: "Avatar",
      flex: 1,
      renderCell: (params) => (
        <img
          src={params.row.image || "/default-avatar.png"}
          alt={params.row.name}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = "/default-avatar.png";
          }}
          style={{
            objectFit: "cover",
            borderRadius: "50%",
            width: "50px",
            height: "50px",
          }}
        />
      ),
    },
    { field: "product", headerName: "Product", flex: 1 },
    {
      field: "payment_method",
      headerName: "Payment Method",
      headerAlign: "left",
      flex: 1,
    },
    { field: "phone", headerName: "Phone Number", flex: 1 },
    { field: "email", headerName: "Email Addresses", flex: 1 },
    { field: "workshop", headerName: "Workshop Location", flex: 1 },
    {
      field: "actions",
      headerName: "Actions",
      minWidth: 200,
      renderCell: (params) => (
        <div className="action">
          <Link to={`/vendors/${params.row.id}`}>
            <div className="view">
              <ViewIcon />
            </div>
          </Link>
          <div className="edit">
            <EditIcon />
          </div>
          <div className="delete">
            <DeleteIcon />
          </div>
        </div>
      ),
    },
  ];

  const truncateWords = (text, maxWords) => {
    if (!text) return "";
    const words = text.split(" ");
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ") + "...";
  };

  return (
    <Box
      margin="1em 0"
      sx={{
        width: { xs: "calc(100% - 80px)", sm: "calc(100% - 80px)", md: "100%" },
      }}
    >
      <Header title="Vendors" subtitle="Manage Vendors" />

      {/* ✅ Always use DataGrid (scrollable on small screens) */}
      <Box
        sx={{
          width: "100%",
          overflowX: "auto",
          marginTop: "2em",
        }}
      >
        <Box sx={{ minWidth: 1000 }}>
          <DataGrid
            autoHeight
            rows={vendors}
            columns={columns}
            getRowId={(row) => row.id}
            disableRowSelectionOnClick
            checkboxSelection
            sx={{
              "& .MuiDataGrid-root": { border: "none" },
              "& .MuiDataGrid-row": { backgroundColor: colors.primary[500] },
              "& .name-column--cell": { color: colors.greenAccent[400] },
              "& .MuiDataGrid-virtualScroller": {
                backgroundColor: colors.primary[400],
              },
              "& .MuiDataGrid-columnHeaders": {
                backgroundColor: colors.primary[100],
                borderBottom: "none",
              },
              "& .MuiDataGrid-footerContainer": {
                borderTop: "none",
                backgroundColor: colors.gray[600],
              },
              "& .MuiDataGrid-cell": { borderBottom: "none" },
            }}
          />
        </Box>
      </Box>

      {/* Render Items per Vendor */}
      {vendors.map((vendor) => (
        <Box key={vendor.id} sx={{ marginTop: "3em" }}>
          <Typography
            variant="h5"
            sx={{ marginBottom: "1em", color: colors.greenAccent[300] }}
          >
            Items by {vendor.name} ({vendor.company})
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: { xs: 1, sm: "2em" },
              padding: { xs: 0, sm: "1em 2.5em" },
              justifyContent:{
                xs: 'center',
                sm: 'center',
                md: 'flex-start',
                lg: 'flex-start',
              },
            }}
          >
            {vendor.items.map((item) => (
              <Card
                key={`${vendor.id}-${item.id}`}
                sx={{
                  backgroundColor: colors.primary[600],
                  width: { xs: 320, sm: 320, md: 250 },
                  transition: "transform 0.2s ease-in-out",
                  "&:hover": { transform: "scale(1.03)" },
                }}
              >
                <CardMedia
                  component="img"
                  image={item.image || "/default-product.jpg"}
                  alt={item.name}
                  sx={{ objectFit: "cover", height: "200px" }}
                />
                <CardContent>
                  <Typography
                    variant="h6"
                    gutterBottom
                    sx={{ color: colors.gray[100], fontWeight: 600 }}
                  >
                    {item.name}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: { xs: "none", sm: "none", md: "block", lg: "block" },
                    }}
                  >
                    {truncateWords(item.description, 7) ||
                      "No description available"}
                  </Typography>
                  <Typography variant="subtitle1" color={colors.primary[200]} component="div">
  <span>
    KES{" "}
    {(item.discount_price !== null &&
      item.discount_price !== undefined &&
      Number(item.discount_price) > 0 &&
      Number(item.discount_price) < Number(item.price))
      ? Number(item.discount_price).toLocaleString()
      : Number(item.price).toLocaleString()}
  </span>

  {item.discount_price !== null &&
    item.discount_price !== undefined &&
    Number(item.discount_price) > 0 &&
    Number(item.discount_price) < Number(item.price) && (
      <Box
        component="span"
        sx={{
          textDecoration: "line-through",
          marginLeft: 1,
          color: "#ff666b",
          fontSize: "0.875rem", // same as body2
        }}
      >
        KES {Number(item.price).toLocaleString()}
      </Box>
    )}
</Typography>





                  <Box sx={{ display: "flex", justifyContent: "space-between" }}>
                    <Box>
                      <Typography variant="caption">
                        Size: {item.size}
                      </Typography>
                      <br />
                      <Typography variant="caption">
                        Stock: {item.in_stock}
                      </Typography>
                    </Box>
                    {/* ✅ Edit Sheet Trigger */}
                    <EditItem vendor={vendor} item={item} />
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>
      ))}
    </Box>
  );
};

export default Vendor_list;
