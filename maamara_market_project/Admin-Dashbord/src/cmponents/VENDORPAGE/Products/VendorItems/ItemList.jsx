import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { baseUrl } from "../../../Constant/Constant";
import api from "../../../../Services/Api";
import { tokens } from "../../../../theme";

import VendorItemRequestForm from "../Forms/VendorItemRequest/VendorItemRequest";
import BannerAdd from "../../Banners/Banners";
import CreateBlog from "../../Blogs/BlogCreate";

const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

const VendorItems = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [priceLoading, setPriceLoading] = useState(false);

  // =========================
  // STATE
  // =========================
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");

  const [historyTab, setHistoryTab] = useState("all");
  const [history, setHistory] = useState([]);

  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

   // =========================
  // SHOW SNACK
  // =========================
  const showSnack = (
    message,
    severity = "success"
  ) => {
    setSnack({
      open: true,
      message,
      severity,
    });
  };

  

  const handleCloseSnack = () =>
    setSnack((prev) => ({ ...prev, open: false }));

  // =========================
  // FETCH ITEMS
  // =========================
  const fetchItems = () => {
    api
      .get(`${baseUrl}/api/item-post/update/`, { withCredentials: true })
      .then((res) => setItems(res.data.results || []))
      .catch(console.error);
  };

  // =========================
  // FETCH HISTORY (NO ADMIN ENDPOINTS)
  // =========================
  const fetchHistory = async () => {
    try {
      const res = await api.get("/api/vendor/history/timeline/", {
        withCredentials: true,
      });

      setHistory(res.data || []);
    } catch (err) {
      console.error("History fetch error:", err);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchHistory();
  }, []);

  // =========================
  // PRICE CHANGE
  // =========================
  // =========================
// PRICE CHANGE
// =========================
const handlePriceChangeSubmit = async (e) => {
  e.preventDefault();

  // ✅ Prevent multiple clicks
  if (priceLoading) return;

  if (!selectedItem || !newPrice || !reason.trim()) {
    showSnack("Please fill all fields.", "warning");
    return;
  }

  setPriceLoading(true);

  try {
    await api.post(
      `/api/item-post/price-change/`,
      {
        item_id: Number(selectedItem),
        new_price: Number(newPrice),
        reason: reason.trim(),
      },
      { withCredentials: true }
    );

    fetchItems();
    fetchHistory();

    setSelectedItem("");
    setNewPrice("");
    setReason("");

    // ✅ Success snackbar
    showSnack(
      "Price change request submitted successfully ✅",
      "success"
    );

  } catch (err) {
    console.error(err);

    // ✅ Error snackbar
    showSnack(
      err?.response?.data?.detail ||
        "Failed to update price",
      "error"
    );

  } finally {
    setPriceLoading(false);
  }
};

  // =========================
  // FILTER HISTORY
  // =========================
  const filteredHistory =
    historyTab === "all"
      ? history
      : history.filter((h) => h.type === historyTab);

  return (
    <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 }, mb: 20 }}>
      {/* HEADER */}
      <Typography
        variant="h5"
        sx={{
          color: colors.gray[100],
          textTransform: "uppercase",
          mb: 3,
        }}
      >
        Create
      </Typography>

      {/* =========================
          MAIN SECTION
      ========================= */}
      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>

        {/* CREATE ITEM */}
        <Box sx={cardStyle(colors)}>
          <Typography sx={titleStyle(colors)}>Create Item</Typography>
          <VendorItemRequestForm />
        </Box>

        {/* =========================
                PRICE CHANGE
            ========================= */}
            <Box sx={cardStyle(colors)}>
              <Typography sx={titleStyle(colors)}>
                Request Price Change
              </Typography>

              <form onSubmit={handlePriceChangeSubmit}>
                <select
                  value={selectedItem}
                  onChange={(e) => setSelectedItem(e.target.value)}
                  style={inputStyle(colors)}
                >
                  <option value="">Select Item</option>

                  {items.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name}
                    </option>
                  ))}
                </select>

                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  placeholder="New price"
                  style={inputStyle(colors)}
                />

                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason"
                  style={{
                    ...inputStyle(colors),
                    minHeight: 80,
                  }}
                />

                {/* ✅ UPDATED BUTTON */}
                <Button
                  type="submit"
                  disabled={priceLoading}
                  variant="contained"
                  sx={{
                    mt: 2,
                    backgroundColor: colors.yellowAccent[200],
                    color: colors.gray[900],
                    minWidth: "160px",

                    "&.Mui-disabled": {
                      backgroundColor: colors.yellowAccent[300],
                      color: colors.gray[900],
                      opacity: 0.7,
                    },
                  }}
                >
                  {priceLoading ? (
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                      }}
                    >
                      <CircularProgress
                        size={18}
                        color="inherit"
                      />

                      Submitting...
                    </Box>
                  ) : (
                    "Submit"
                  )}
                </Button>
              </form>
            </Box>

        {/* BANNER */}
        <Box sx={cardStyle(colors)} style={{display:'flex', justifyContent:'center', alignItems:'center'}}>
          <BannerAdd item={items} />
        </Box>

        {/* BLOG */}
        <Box sx={cardStyle(colors)}>
          <CreateBlog items={items} />
        </Box>
      </Box>

      {/* =========================
          HISTORY SECTION
      ========================= */}
      <Box sx={{ mt: 5 }}>
        <Typography sx={{ color: colors.gray[100], mb: 2 }}>
          Activity History
        </Typography>

        {/* FILTER BUTTONS */}
        <Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
          {["all", "banners", "blogs", "prices"].map((tab) => (
            <Button
              key={tab}
              onClick={() => setHistoryTab(tab)}
              variant={historyTab === tab ? "contained" : "outlined"}
              sx={{
                backgroundColor:
                  historyTab === tab
                    ? colors.primary[400]
                    : "transparent",
                color: colors.gray[100],
                border: `1px solid ${colors.gray[100]}`,
              }}
            >
              {tab}
            </Button>
          ))}
        </Box>

        {/* HISTORY LIST */}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {filteredHistory?.map((h) => (
            <Box
              key={h.id + h.type}
              sx={{
                p: 2,
                borderRadius: 2,
                backgroundColor: colors.primary[600],
                border: `1px solid ${colors.gray[100]}`,
                color: colors.gray[100],
              }}
            >
              <Typography fontWeight="bold">
                {truncateWords(
                  h.title || h.name || h.type,
                  8
                )}
              </Typography>

              <Typography fontSize={12}>
                {truncateWords(
                  h.subtitle ||
                    h.description ||
                    h.message ||
                    "No details",
                  14
                )}
              </Typography>

              <Typography fontSize={11} sx={{ opacity: 0.7 }}>
                Type: {h.type}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>

      {/* SNACKBAR */}
      {/* ✅ UPDATED SNACKBAR */}
      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={handleCloseSnack}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={handleCloseSnack}
          severity={snack.severity}
          variant="filled"
          elevation={6}
          sx={{
            width: "100%",
            borderRadius: "10px",
            fontWeight: "bold",
          }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

// =========================
// STYLES
// =========================
const cardStyle = (colors) => ({
  backgroundColor: colors.primary[600],
  flex: "1 1 calc(50% - 24px)",
  border: `1px solid ${colors.gray[100]}`,
  borderRadius: 2,
  p: 2,
  color: colors.gray[100],
});

const titleStyle = (colors) => ({
  textAlign: "center",
  borderBottom: `1px solid ${colors.yellowAccent[600]}`,
  mb: 2,
});

const inputStyle = (colors) => ({
  width: "100%",
  padding: 8,
  marginBottom: 10,
  backgroundColor: colors.primary[500],
  color: colors.gray[100],
  border: `1px solid ${colors.gray[100]}`,
  borderRadius: 4,
});

export default VendorItems;