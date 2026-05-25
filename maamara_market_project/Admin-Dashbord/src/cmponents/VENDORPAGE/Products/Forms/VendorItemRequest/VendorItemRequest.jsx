import React, { useState } from "react";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../Constant/Constant";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  useTheme,
  Snackbar,
  Alert,
  CircularProgress,
  Button,
  Box,
} from "@mui/material";

import { tokens } from "../../../../../theme";
import { colorPaletteOutline } from "ionicons/icons";

// ✅ Validation Schema
const requestSchema = z.object({
  name: z.string().min(2, "Name is required"),

  description: z
    .string()
    .min(10, "Description should be at least 10 characters"),

  price: z.coerce.number().positive("Price must be greater than 0"),

  image: z.any().refine((files) => files && files.length > 0, {
    message: "Image is required",
  }),
});

function VendorItemRequestForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
  });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Preview state
  const [preview, setPreview] = useState(null);

  // ✅ Loading state
  const [submitting, setSubmitting] = useState(false);

  // ✅ Snackbar state
  const [snack, setSnack] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  // =========================
  // SHOW SNACK
  // =========================
  const showSnack = (message, severity = "success") => {
    setSnack({
      open: true,
      message,
      severity,
    });
  };

  const handleCloseSnack = () => {
    setSnack((prev) => ({
      ...prev,
      open: false,
    }));
  };

  // =========================
  // HANDLE SUBMIT
  // =========================
  const onSubmit = async (data) => {
    // ✅ Prevent multiple clicks
    if (submitting) return;

    setSubmitting(true);

    const formData = new FormData();

    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", data.price);
    formData.append("image", data.image[0]);

    try {
      await api.post(
        `${baseUrl}/api/vendor/item-requests/create/`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );

      // ✅ Success snackbar
      showSnack(
        "Item request submitted successfully for approval ✅",
        "success"
      );

      // ✅ Reset form
      reset();
      setPreview(null);

    } catch (err) {
      console.error(
        "❌ Error submitting request:",
        err.response?.data || err
      );

      // ✅ Error snackbar
      showSnack(
        err?.response?.data?.detail ||
          "Something went wrong while submitting",
        "error"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // =========================
  // IMAGE PREVIEW
  // =========================
  const handleImageChange = (e) => {
    const file = e.target.files[0];

    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

        {/* ITEM NAME */}
        <div>
          <label className="block font-medium mb-1">
            Item Name
          </label>

          <input
            type="text"
            {...register("name")}
            className="border rounded p-2 w-full"
            style={{
              backgroundColor: colors.primary[500],
              outline: `1px solid ${colors.gray[100]}`,
              color: colors.gray[100],
            }}
          />

          {errors.name && (
            <p className="text-red-500 text-sm mt-1">
              {errors.name.message}
            </p>
          )}
        </div>

        {/* DESCRIPTION */}
        <div>
          <label className="block font-medium mb-1">
            Description
          </label>

          <textarea
            {...register("description")}
            className="border rounded p-2 w-full"
            rows={5}
            style={{
              backgroundColor: colors.primary[500],
              outline: `1px solid ${colors.gray[100]}`,
              color: colors.gray[100],
            }}
          />

          {errors.description && (
            <p className="text-red-500 text-sm mt-1">
              {errors.description.message}
            </p>
          )}
        </div>

        {/* PRICE */}
        <div>
          <label className="block font-medium mb-1">
            Price
          </label>

          <input
            type="number"
            step="0.01"
            {...register("price")}
            className="border rounded p-2 w-full"
            style={{
              backgroundColor: colors.primary[500],
              outline: `1px solid ${colors.gray[100]}`,
              color: colors.gray[100],
            }}
          />

          {errors.price && (
            <p className="text-red-500 text-sm mt-1">
              {errors.price.message}
            </p>
          )}
        </div>

        {/* IMAGE */}
        <div>
          <label className="block font-medium mb-1">
            Image
          </label>

          <input
            type="file"
            accept="image/*"
            {...register("image")}
            onChange={handleImageChange}
            className="w-full"
            style={{
              backgroundColor: colors.primary[500],
              outline: `1px solid ${colors.gray[100]}`,
              color: colors.gray[100],
            }}
          />

          {errors.image && (
            <p className="text-red-500 text-sm mt-1">
              {errors.image.message}
            </p>
          )}

          {/* IMAGE PREVIEW */}
          {preview && (
            <Box sx={{ mt: 2 }}>
              <img
                src={preview}
                alt="Preview"
                className="w-40 h-40 object-cover rounded-md border"
              />
            </Box>
          )}
        </div>

        {/* SUBMIT BUTTON */}
        <Button
          type="submit"
          variant="contained"
          disabled={submitting}
          sx={{
            backgroundColor: colors.greenAccent[700],
            color: colors.gray[100],
            px: 4,
            py: 1.2,
            borderRadius: "10px",
            textTransform: "none",
            fontWeight: "bold",
            minWidth: "180px",

            "&:hover": {
              backgroundColor: colors.greenAccent[700],
            },

            "&.Mui-disabled": {
              backgroundColor: colors.greenAccent[700],
              color: colors.gray[100],

              opacity: 0.7,
            },
          }}
        >
          {submitting ? (
            <>
              <CircularProgress
                size={20}
                color="inherit"
                sx={{ mr: 1 }}
              />
              Submitting...
            </>
          ) : (
            "Submit Request"
          )}
        </Button>
      </form>

      {/* =========================
          SNACKBAR
      ========================= */}
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
    </>
  );
}

export default VendorItemRequestForm;