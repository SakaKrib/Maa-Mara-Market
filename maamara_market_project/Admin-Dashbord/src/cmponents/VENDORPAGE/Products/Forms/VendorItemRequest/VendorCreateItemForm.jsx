import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
} from "@mui/material";
import { tokens } from "../../../../../theme";
import { CreateItemformSchema } from "../CreateIteSchemaHook"; 
import { useLocation, useNavigate } from "react-router-dom";
import CreateItemFromRequest from "../CreateItem/CreatItemFormRequst";

const AdminCreateItemForVendor = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();

  // Pull vendor request and vendor info
  const request = location.state || {};
  const vendor = request.vendor || {};

  // The request model keeps name/description/price for compatibility, while
  // draft_item contains the complete submitted product definition. Uploaded
  // files live in draft_media and must never be reconstructed from JSON.
  const draftData = request.draft_item && typeof request.draft_item === "object"
    ? request.draft_item
    : {};
  const draftMedia = Array.isArray(request.draft_media) ? request.draft_media : [];
  const mainMedia = draftMedia.find((asset) => asset.kind === "main");
  const videoMedia = draftMedia.find((asset) => asset.kind === "video");
  const mediaByVariant = new Map(
    draftMedia
      .filter((asset) => asset.kind === "variant" && asset.variant_key)
      .map((asset) => [String(asset.variant_key).toLowerCase(), asset.url])
  );

  const normalizedRequest = {
    ...request,
    ...draftData,
    name: draftData.name ?? request.name ?? "",
    description: draftData.description ?? request.description ?? "",
    price: draftData.price ?? request.price ?? 0,
    image: mainMedia?.url ?? request.image ?? draftData.image ?? "",
    video: videoMedia?.url ?? draftData.video ?? "",
    color_variants: (draftData.color_variants || draftData.variants || []).map((variant) => ({
      ...variant,
      color_image:
        mediaByVariant.get(String(variant.color).toLowerCase()) ||
        variant.color_image ||
        variant.image ||
        null,
    })),
  };

  const [open, setOpen] = useState(true);

  // Initialize the form
  const form = useForm({
    resolver: zodResolver(CreateItemformSchema),
    defaultValues: {
      section: normalizedRequest.section || "Organic",
      department: "",
      category: "",
      subcategory: "",
      name: normalizedRequest.name || "",
      description: normalizedRequest.description || "",
      price: normalizedRequest.price || 0,
      discount_price: normalizedRequest.discount_price || 0,
      in_stock: 0,
      item_attribute: "",
      image: normalizedRequest.image || "",
      video: normalizedRequest.video || "",
      size_variant: normalizedRequest.size_variant || [],
      kids_sizes: [],
      shoe_type: "",
      shoe_gender: "",
      shoe_input: [],
      color_variants: normalizedRequest.color_variants || [],
      length: { value: "", unit: "cm" }, // avoid null
      weight: { value: "", unit: "kg" }, // avoid null
      manufactured_date: "",
      expiry_date: "",
      is_fresh_food: false,
      is_organic: false,
    },
  });

  // Optional: reset form if request updates dynamically
  useEffect(() => {
    if (request) {
      form.reset({
        ...form.getValues(),
        ...normalizedRequest,
        name: normalizedRequest.name || "",
        description: normalizedRequest.description || "",
        price: normalizedRequest.price || 0,
        image: normalizedRequest.image || "",
        video: normalizedRequest.video || "",
        color_variants: normalizedRequest.color_variants || [],
      });
    }
  }, [request, form]);

  const handleClose = () => {
    setOpen(false);
    navigate(-1); // go back when dialog closes
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>Create Item for Vendor {vendor.first_name}</DialogTitle>

      <DialogContent dividers>
        <CreateItemFromRequest
          form={form}
          vendorId={vendor?.id ?? ""}
          vendor={vendor}
          item={normalizedRequest}
          onSave={(savedData) => {
            console.log("Draft saved:", savedData);
            // optional: update your local state or show a toast here
          }}
        />
      </DialogContent>

      <DialogActions>
        
        <Button
          onClick={handleClose}
          color="primary"
          variant="contained"
        >
          Save Item
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminCreateItemForVendor;
