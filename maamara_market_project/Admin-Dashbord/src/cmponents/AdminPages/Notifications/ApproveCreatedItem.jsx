import React, { useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Box,
  Button,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useLocation, useNavigate } from "react-router-dom";
import AdminCreateExistingVendorItems from "../../VENDORPAGE/Products/Forms/CreateItem/AdminCreateItemForExistingVendor";

const CreateItemModal = ({ open, onClose, item, onSave }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const routeItem = location.state || null;
  const routeMode = open === undefined;
  const isOpen = routeMode ? true : !!open;
  const currentItem = item ?? routeItem;
  

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
      open={isOpen}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      scroll="paper"
      
    >
      
      {/* HEADER */}
      <DialogTitle className="!border-b !border-border !bg-card !px-2 !py-3 !text-card-foreground">
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
            onClick={() => (routeMode ? navigate(-1) : onClose?.())}
            variant="text"
            className="rounded-[20px] bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Back
          </Button>

          <Box className="text-base font-semibold">Create / Edit Item</Box>

          {/* ❌ Close */}
          <IconButton onClick={() => (routeMode ? navigate(-1) : onClose?.())}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      {/* BODY */}
      <DialogContent dividers className="!border-border !bg-card !p-2 sm:!p-3">
      <AdminCreateExistingVendorItems
        initialItem={currentItem ?? null}
        itemId={currentItem?.id ?? null}
        vendorId={currentItem?.vendor?.id ?? null}
        vendor={currentItem?.vendor ?? null}
        onSave={(data) => {
            console.log("Saved:", data);
            onSave?.(currentItem?.id);   // unlock correct request
            if (routeMode) navigate(-1); else onClose?.();
        }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateItemModal;