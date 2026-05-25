import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Button,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AdminCreateExistingVendorItems from "../../VENDORPAGE/Products/Forms/CreateItem/AdminCreateItemForExistingVendor";
import { tokens } from "../../../theme";

const CreateItemModal = ({ open, onClose, item, onSave }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  

  // ✅ Enable arrow key scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      const scrollAmount = 60;

      if (e.key === "ArrowDown") {
        window.scrollBy({ top: scrollAmount, behavior: "smooth" });
      }

      if (e.key === "ArrowUp") {
        window.scrollBy({ top: -scrollAmount, behavior: "smooth" });
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      
    >
      
      {/* HEADER */}
      <DialogTitle>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {/* 🔙 Back Button */}
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onClose}
            variant="text"
            sx={{
              color: colors.gray[100],
              backgroundColor: colors.primary[600],
            }}
          >
            Back
          </Button>

          <Box>Create / Edit Item</Box>

          {/* ❌ Close */}
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* BODY */}
      <DialogContent dividers>
      <AdminCreateExistingVendorItems
        initialItem={item ?? null}
        itemId={item?.id ?? null}
        vendorId={item?.vendor?.id ?? null}
        vendor={item?.vendor ?? null}
        onSave={(data) => {
            console.log("Saved:", data);
            onSave?.(item?.id);   // unlock correct request
            onClose();
        }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateItemModal;