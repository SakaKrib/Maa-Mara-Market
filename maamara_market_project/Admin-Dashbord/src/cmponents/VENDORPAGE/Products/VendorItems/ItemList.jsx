import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { baseUrl } from "../../../Constant/Constant";
import api from "../../../../Services/Api";
import { tokens } from "../../../../theme";
import { useVendor } from "../vendorhooks";
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
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [reason, setReason] = useState("");

  const vendormap = useVendor();
  const vendor = vendormap.vendor;

  const fetchItems = () => {
    api
      .get(`${baseUrl}/api/item-post/update/`, { withCredentials: true })
      .then((res) => setItems(res.data.results || []))
      .catch((err) => console.error("Error fetching vendor items:", err));
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handlePriceChangeSubmit = (e) => {
    e.preventDefault();
    if (!selectedItem || !newPrice || !reason.trim()) {
      alert("Please fill all fields.");
      return;
    }

    api
      .post(
        `${baseUrl}/api/item-post/price-change/`,
        {
          item_id: Number(selectedItem),
          new_price: Number(newPrice),
          reason: reason.trim(),
        },
        { withCredentials: true }
      )
      .then(() => {
        fetchItems();
        setSelectedItem("");
        setNewPrice("");
        setReason("");
        alert("Price change request submitted successfully.");
      })
      .catch((err) => console.error("Error updating price:", err));
  };

  return (
    <Box sx={{ mt: 4, px: { xs: 2, sm: 3, md: 4 } }}>
      {/* HEADER */}
      <Typography
        variant="h5"
        sx={{
          color: colors.gray[100],
          textTransform: "uppercase",
          mb: 3,
          textAlign: { xs: "center", md: "left" },
        }}
      >
        My Items
      </Typography>

      {/* MAIN FLEX LAYOUT */}
      <Box
        sx={{
          display: "flex",
          flexWrap: "wrap",
          gap: 3,
          justifyContent: { xs: "center", md: "flex-start" },
          
        }}
      >
        {/* 1️⃣ Create Item */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 100%",
              md: "1 1 calc(50% - 24px)",
              lg: "1 1 calc(25% - 24px)",
            },
            maxWidth: {
              xs: "100%",
              sm: "100%",
              md: "calc(50% - 24px)",
              lg: "calc(25% - 24px)",
            },
            border: `1px solid ${colors.gray[100]}`,
            borderRadius: 2,
            p: 2,
            color: colors.gray[100],
          }}
        >
          <Typography
            variant="h6"
            sx={{
              color: colors.gray[100],
              textAlign: "center",
              borderBottom: `1px solid ${colors.yellowAccent[600]}`,
              mb: 2,
              py: 1,
            }}
          >
            Create Item
          </Typography>
          <VendorItemRequestForm />
        </Box>

        {/* 2️⃣ Price Change Request */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 100%",
              md: "1 1 calc(50% - 24px)",
              lg: "1 1 calc(25% - 24px)",
            },
            maxWidth: {
              xs: "100%",
              sm: "100%",
              md: "calc(50% - 24px)",
              lg: "calc(25% - 24px)",
            },
            border: `1px solid ${colors.gray[100]}`,
            borderRadius: 2,
            p: 2,
            color: colors.gray[100],
          }}
        >
          <Typography
            variant="h6"
            sx={{
              mb: 2,
              textAlign: "center",
              borderBottom: `1px solid ${colors.yellowAccent[600]}`,
              py: 1,
            }}
          >
            Request Price Change
          </Typography>

          {items.length === 0 ? (
            <Typography>No items found.</Typography>
          ) : (
            <form
              onSubmit={handlePriceChangeSubmit}
              style={{ display: "flex", flexDirection: "column", gap: "1em" }}
            >
              <label>Select Item</label>
              <select
                value={selectedItem}
                onChange={(e) => setSelectedItem(e.target.value)}
                style={{
                  padding: "0.5em",
                  borderRadius: 4,
                  backgroundColor: colors.primary[500],
                  color: colors.gray[100],
                  border: `1px solid ${colors.gray[100]}`,
                }}
              >
                <option value="">-- Select Item --</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>

              <label>New Price</label>
              <input
                type="number"
                placeholder="Enter new price"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                style={{
                  padding: "0.5em",
                  borderRadius: 4,
                  backgroundColor: colors.primary[500],
                  color: colors.gray[100],
                  border: `1px solid ${colors.gray[100]}`,
                }}
              />

              <label>Reason</label>
              <textarea
                placeholder="Enter reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                style={{
                  padding: "0.5em",
                  borderRadius: 4,
                  backgroundColor: colors.primary[500],
                  color: colors.gray[100],
                  minHeight: "60px",
                }}
              />

              <Button
                type="submit"
                sx={{
                  backgroundColor: colors.yellowAccent[300],
                  color: colors.gray[900],
                  mt: 1,
                }}
                variant="contained"
              >
                Update Price
              </Button>
            </form>
          )}
        </Box>

        {/* 3️⃣ Banner Add */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 100%",
              md: "1 1 calc(50% - 24px)",
              lg: "1 1 calc(25% - 24px)",
            },
            maxWidth: {
              xs: "100%",
              sm: "100%",
              md: "50%",
              lg: "25%",
            },
            border: {sm:`1px solid ${colors.gray[100]}`, md:"none", lg:`1px solid ${colors.gray[100]}`},
            borderRadius: 2,
            p: 2,
            ml:{md:'-1em'}
          }}
        >
          <BannerAdd item={items} />
        </Box>

        {/* 4️⃣ Blog Create */}
        <Box
          sx={{
            flex: {
              xs: "1 1 100%",
              sm: "1 1 100%",
              md: "1 1 calc(50% - 24px)",
              lg: "1 1 calc(25% - 24px)",
            },
            maxWidth: {
              xs: "100%",
              sm: "100%",
              md: "50%",
              lg: "25%",
            },
            border: {sm:`1px solid ${colors.gray[100]}`, md:"none", lg:`1px solid ${colors.gray[100]}`},
            borderRadius: 2,
            p: 2,
            ml:{md:'-1.3em'}
          }}
        >
          <CreateBlog items={items} />
        </Box>
      </Box>
    </Box>
  );
};

export default VendorItems;
