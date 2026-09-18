import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardMedia,
  Button,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { baseUrl } from "../../../Constant/Constant";
import api from "../../../../Services/Api";
import { tokens } from "../../../../theme";
import EditItem from "../Forms/EditItem/EditItem";
import { useVendor } from "../vendorhooks";

// Helper to truncate text
const truncateWords = (text, numWords) => {
  if (!text) return "";
  const words = text.split(" ");
  return words.length > numWords
    ? words.slice(0, numWords).join(" ") + "..."
    : text;
};

const ItemsOnsite = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();

  // --- State hooks ---
  const [items, setItems] = useState([]);
  const [showRight, setShowRight] = useState(false);
  const { vendor } = useVendor(); // Assuming useVendor provides vendor info

  // --- Fetch vendor items ---
  const fetchItems = async () => {
    try {
      const res = await api.get(`${baseUrl}/api/item-post/update/`, {
        withCredentials: true,
      });
      setItems(res.data.results || []);
    } catch (err) {
      console.error("Error fetching vendor items:", err);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  return (
    <Box sx={{ marginTop: "3em" }}>
      {/* HEADER */}
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.5em 1em",
        }}
      >
        <Typography
          variant="h5"
          sx={{ color: colors.gray[100], textTransform: "uppercase" }}
        >
          My Items
        </Typography>
      </Box>

      {/* MAIN FLEX LAYOUT */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          gap: 2,
          padding: ".5em 1em",
          width: "100%",
        }}
      >
        {/* LEFT: Items grid */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* <Button
            variant="contained"
            onClick={() => setShowRight(!showRight)}
            sx={{
              backgroundColor: colors.blueAccent[500],
              height: "max-content",
              padding: ".2em .8em",
              marginBottom: "1em",
            }}
          >
            {showRight ? "Hide Side Panel" : "Show Side Panel"}
          </Button> */}

          <Box
            sx={{
              display: "flex",
              gap: { xs: 1, sm: "2em", md: "1em" },
              flexWrap: "wrap",
            }}
          >
            {items.length === 0 ? (
              <Typography>No items found.</Typography>
            ) : (
              items.map((item) => (
                <Card
                  key={item.id}
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
                    onClick={() => navigate(`items/${item.id}`)}
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
                    <Typography
                      variant="subtitle1"
                      color={colors.primary[200]}
                      component="div"
                    >
                      KES{" "}
                      {item.discount_price &&
                      Number(item.discount_price) > 0 &&
                      Number(item.discount_price) < Number(item.price)
                        ? Number(item.discount_price).toLocaleString()
                        : Number(item.price).toLocaleString()}
                      {item.discount_price &&
                        Number(item.discount_price) > 0 &&
                        Number(item.discount_price) < Number(item.price) && (
                          <Box
                            component="span"
                            sx={{
                              textDecoration: "line-through",
                              marginLeft: 1,
                              color: "#ff666b",
                              fontSize: "0.875rem",
                            }}
                          >
                            KES {Number(item.price).toLocaleString()}
                          </Box>
                        )}
                    </Typography>
                    <Box
                      sx={{ display: "flex", justifyContent: "space-between" }}
                    >
                      <Typography variant="caption">
                        Stock: {item.in_stock}
                      </Typography>
                      <Box className="rounded-md bg-white text-sm text-black px-2">
                        <EditItem
                          vendor={vendor}
                          item={item}
                          onSuccess={fetchItems}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default ItemsOnsite;
