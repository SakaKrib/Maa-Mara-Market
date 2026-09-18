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

  const [open, setOpen] = useState(true);

  // Initialize the form
  const form = useForm({
    resolver: zodResolver(CreateItemformSchema),
    defaultValues: {
      section: "Organic",
      department: "",
      category: "",
      subcategory: "",
      name: request.name || "",
      description: request.description || "",
      price: request.price || 0,
      discount_price: 0,
      in_stock: 0,
      item_attribute: "",
      image: request.image || "",
      size_variant: [],
      kids_sizes: [],
      shoe_type: "",
      shoe_gender: "",
      shoe_input: [],
      color_variants: [],
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
        name: request.name || "",
        description: request.description || "",
        price: request.price || 0,
        image: request.image || "",
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
          item={request}
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
