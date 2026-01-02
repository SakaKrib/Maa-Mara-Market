"use client";
import React, { useState, useEffect } from "react";
import api from "../../../Services/Api";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import { Card, CardHeader, CardTitle, CardContent } from "../../../../components/ui/card";
import { useTheme, Snackbar, Alert } from "@mui/material";
import { tokens } from "../../../theme";
import useItems from "../../../PublicUiForAll/PublicUi/ItemHook/ItemHook";

const BannerAdd = () => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [image, setImage] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ Snackbar State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success", // success | error | warning | info
  });

  const itemscreated = useItems();
  const items = itemscreated.items;

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    if (items.length > 0) {
      setSelectedItem(items[0].id);
    }
  }, [items]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedItem) {
      setSnackbar({
        open: true,
        message: "❌ No product selected. Please select a product.",
        severity: "error",
      });
      return;
    }

    const formData = new FormData();
    formData.append("title", title);
    formData.append("subtitle", subtitle);
    formData.append("background_color", backgroundColor);
    formData.append("item", selectedItem);
    if (image instanceof File) {
      formData.append("image", image);
    }

    try {
      const response = await api.post("/api/banners/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        withCredentials: true,
      });

      if (response.status === 201) {
        setSnackbar({
          open: true,
          message: "✅ Banner Created Successfully",
          severity: "success",
        });
        setTitle("");
        setSubtitle("");
        setBackgroundColor("#ffffff");
        setImage(null);
        setSelectedItem(items.length > 0 ? items[0].id : null);
      }
    } catch (error) {
      setSnackbar({
        open: true,
        message: error.response?.data?.detail || "❌ Failed to create banner.",
        severity: "error",
      });
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <div
      className="flex justify-center items-center "
      style={{  color: colors.gray[100] }}
    >
      <Card
        className="w-max max-w-lg shadow-lg"
        style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}
      >
        <CardHeader>
          <CardTitle className="text-center text-xl font-bold">
            🪧 Create Product Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Enter banner title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                style={{ color: colors.gray[100] }}
              />
            </div>

            <div>
              <Label htmlFor="subtitle">Subtitle</Label>
              <Input
                id="subtitle"
                placeholder="Enter banner subtitle"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="selectedItem">Select Product</Label>
              <select
                id="selectedItem"
                className="w-full p-2 rounded border"
                style={{ backgroundColor: colors.primary[500], color: colors.gray[100] }}
                value={selectedItem || ""}
                onChange={(e) => setSelectedItem(Number(e.target.value))}
                required
              >
                <option value="">-- Select a product --</option>
                {items.length > 0 ? (
                  items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))
                ) : (
                  <option disabled>No products available</option>
                )}
              </select>
            </div>

            <div>
              <Label htmlFor="image">Banner Image</Label>
              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
                required
              />
              {image && <p className="text-xs text-gray-500 mt-1">📎 {image.name}</p>}
            </div>

            <div>
              <Label htmlFor="color">Background Color</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  className="w-16 h-12 cursor-pointer"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                />
                <span className="text-sm text-gray-600">{backgroundColor}</span>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary/90 text-white"
            >
              Create Banner
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* ✅ Snackbar Alert */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BannerAdd;
