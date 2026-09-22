import React, { useState, useEffect } from "react";
import api from "../../../Services/Api";

import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { Label } from "../../../../components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../../components/ui/card";

import {
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";

import { tokens } from "../../../theme";

import useItems from "../../../PublicUiForAll/PublicUi/ItemHook/ItemHook";

const BannerAdd = () => {
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [backgroundColor, setBackgroundColor] = useState("#ffffff");
  const [image, setImage] = useState(null);

  // CTA SYSTEM
  const [ctaType, setCtaType] = useState("item");
  const [ctaItem, setCtaItem] = useState("");

  const [submitting, setSubmitting] = useState(false);

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const itemscreated = useItems();
  const items = itemscreated.items;

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  useEffect(() => {
    if (items.length > 0) {
      setCtaItem(items[0].id);
    }
  }, [items]);

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (submitting) return;

    if (ctaType === "item" && !ctaItem) {
      setSnackbar({
        open: true,
        message: "❌ Please select a product",
        severity: "error",
      });
      return;
    }

    setSubmitting(true);

    const formData = new FormData();

    formData.append("title", title);
    formData.append("subtitle", subtitle);
    formData.append("background_color", backgroundColor);

    // CTA FIX (clean backend match)
    formData.append("cta_type", ctaType);
    formData.append("cta_item", ctaType === "item" ? ctaItem : "");
    formData.append("cta_url", "");

    if (image instanceof File) {
      formData.append("image", image);
    }

    try {
      const response = await api.post("/api/vendor/banners/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true,
      });

      if (response.status === 201) {
        setSnackbar({
          open: true,
          message: "✅ Banner Created Successfully",
          severity: "success",
        });

        // reset
        setTitle("");
        setSubtitle("");
        setBackgroundColor("#ffffff");
        setImage(null);
        setCtaType("item");
        setCtaItem(items.length > 0 ? items[0].id : "");
      }
    } catch (error) {
      console.error(error);

      setSnackbar({
        open: true,
        message:
          error.response?.data?.detail ||
          "❌ Failed to create banner.",
        severity: "error",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="flex justify-center items-center"
      style={{ color: colors.gray[100] }}
    >
      <Card
        className="w-max max-w-lg shadow-lg"
        style={{
          backgroundColor: colors.primary[600],
          color: colors.gray[100],
        }}
      >
        <CardHeader>
          <CardTitle className="text-center text-xl font-bold">
            🪧 Create Product Banner
          </CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <Label>Title</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Subtitle</Label>
              <Input
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
              />
            </div>

            <div>
              <Label>CTA Type</Label>
              <select
                value={ctaType}
                onChange={(e) => setCtaType(e.target.value)}
                className="w-full p-2 rounded"
                style={{
                  backgroundColor: colors.primary[500],
                  color: colors.gray[100],
                }}
              >
                <option value="item">Product</option>
                <option value="external">External Link</option>
              </select>
            </div>

            {ctaType === "item" && (
              <div>
                <Label>Select Product</Label>
                <select
                  value={ctaItem}
                  onChange={(e) => setCtaItem(e.target.value)}
                  className="w-full p-2 rounded"
                >
                  <option value="">-- Select --</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <Label>Image</Label>
              <Input
                type="file"
                onChange={(e) => setImage(e.target.files[0])}
                required
              />
            </div>

            <div>
              <Label>Background Color</Label>
              <Input
                type="color"
                value={backgroundColor}
                onChange={(e) => setBackgroundColor(e.target.value)}
              />
            </div>

            <Button type="submit" disabled={submitting} className="w-full bg-[#2563eb] text-white hover:bg-[#1d4ed8]">
              {submitting ? (
                <>
                  <CircularProgress size={18} /> Creating...
                </>
              ) : (
                "Create Banner"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BannerAdd;