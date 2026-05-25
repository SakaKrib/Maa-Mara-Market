
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
  const [selectedItem, setSelectedItem] = useState(null);

  // ✅ Loading state
  const [submitting, setSubmitting] = useState(false);

  // ✅ Snackbar State
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const itemscreated = useItems();
  const items = itemscreated.items;

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // =========================
  // DEFAULT ITEM
  // =========================
  useEffect(() => {
    if (items.length > 0) {
      setSelectedItem(items[0].id);
    }
  }, [items]);

  // =========================
  // CLOSE SNACKBAR
  // =========================
  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const handleSubmit = async (e) => {
    e.preventDefault();

    // ✅ Prevent multiple clicks
    if (submitting) return;

    if (!selectedItem) {
      setSnackbar({
        open: true,
        message: "❌ No product selected. Please select a product.",
        severity: "error",
      });

      return;
    }

    setSubmitting(true);

    const formData = new FormData();

    formData.append("title", title);
    formData.append("subtitle", subtitle);
    formData.append("background_color", backgroundColor);
    formData.append("item", selectedItem);

    if (image instanceof File) {
      formData.append("image", image);
    }

    try {
      const response = await api.post(
        "/vendor/banners/",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },

          withCredentials: true,
        }
      );

      if (response.status === 201) {
        // ✅ Success snackbar
        setSnackbar({
          open: true,
          message: "✅ Banner Created Successfully",
          severity: "success",
        });

        // ✅ Reset form
        setTitle("");
        setSubtitle("");
        setBackgroundColor("#ffffff");
        setImage(null);
        setSelectedItem(items.length > 0 ? items[0].id : null);
      }
    } catch (error) {
      console.error(error);

      // ✅ Error snackbar
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
      style={{
        color: colors.gray[100],
      }}
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
          <form
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            {/* TITLE */}
            <div>
              <Label htmlFor="title">
                Title
              </Label>

              <Input
                id="title"
                placeholder="Enter banner title"
                value={title}
                onChange={(e) =>
                  setTitle(e.target.value)
                }
                required
                style={{
                  color: colors.gray[100],
                  backgroundColor:
                    colors.primary[500],
                }}
              />
            </div>

            {/* SUBTITLE */}
            <div>
              <Label htmlFor="subtitle">
                Subtitle
              </Label>

              <Input
                id="subtitle"
                placeholder="Enter banner subtitle"
                value={subtitle}
                onChange={(e) =>
                  setSubtitle(e.target.value)
                }
                style={{
                  color: colors.gray[100],
                  backgroundColor:
                    colors.primary[500],
                }}
              />
            </div>

            {/* SELECT PRODUCT */}
            <div>
              <Label htmlFor="selectedItem">
                Select Product
              </Label>

              <select
                id="selectedItem"
                className="w-full p-2 rounded border"
                style={{
                  backgroundColor:
                    colors.primary[500],

                  color: colors.gray[100],
                }}
                value={selectedItem || ""}
                onChange={(e) =>
                  setSelectedItem(
                    Number(e.target.value)
                  )
                }
                required
              >
                <option value="">
                  -- Select a product --
                </option>

                {items.length > 0 ? (
                  items.map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name}
                    </option>
                  ))
                ) : (
                  <option disabled>
                    No products available
                  </option>
                )}
              </select>
            </div>

            {/* IMAGE */}
            <div>
              <Label htmlFor="image">
                Banner Image
              </Label>

              <Input
                id="image"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setImage(e.target.files[0])
                }
                required
                style={{
                  backgroundColor:
                    colors.primary[500],
                  color: colors.gray[100],
                }}
              />

              {image && (
                <p className="text-xs mt-1">
                  📎 {image.name}
                </p>
              )}
            </div>

            {/* COLOR */}
            <div>
              <Label htmlFor="color">
                Background Color
              </Label>

              <div className="flex items-center gap-2">
                <Input
                  id="color"
                  type="color"
                  className="w-16 h-12 cursor-pointer"
                  value={backgroundColor}
                  onChange={(e) =>
                    setBackgroundColor(
                      e.target.value
                    )
                  }
                />

                <span className="text-sm">
                  {backgroundColor}
                </span>
              </div>
            </div>

            {/* SUBMIT BUTTON */}
            <Button
              type="submit"
              disabled={submitting}
              className="w-full text-white font-bold"
              style={{
                backgroundColor:
                  colors.greenAccent[500],
                opacity: submitting ? 0.8 : 1,
                cursor: submitting
                  ? "not-allowed"
                  : "pointer",
              }}
            >
              {submitting ? (
                <div className="flex items-center justify-center gap-2">
                  <CircularProgress
                    size={18}
                    color="inherit"
                  />
                  Creating Banner...
                </div>
              ) : (
                "Create Banner"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* =========================
          SNACKBAR
      ========================= */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{
          vertical: "top",
          horizontal: "right",
        }}
      >
        <Alert
          onClose={handleCloseSnackbar}
          severity={snackbar.severity}
          variant="filled"
          elevation={6}
          sx={{
            width: "100%",
            borderRadius: "10px",
            fontWeight: "bold",
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </div>
  );
};

export default BannerAdd;