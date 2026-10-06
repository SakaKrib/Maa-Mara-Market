import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  useTheme,
} from "@mui/material";
import { tokens } from "../../../../../theme";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../../Auth/AuthContext/Context";
import ItemAddNew from "../AddingNewItem";

const AdminCreateItemForVendor = () => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Pull the vendor request and vendor info from the existing admin review route.
  const request = location.state || {};
  const vendor = request.vendor || {};
  const approvalRequestId = request.id ?? request.pk ?? null;
  const isAdmin = user?.role === "admin";

  const [open, setOpen] = useState(true);

  const handleClose = () => {
    setOpen(false);
    navigate(-1);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="lg" fullWidth>
      <DialogTitle>
        Review Item for Vendor {vendor.first_name}
      </DialogTitle>

      <DialogContent dividers>
        <ItemAddNew
          initialItem={request}
          vendorId={vendor?.id ?? ""}
          vendor={vendor}
          isAdmin={isAdmin}
          approvalMode={isAdmin && Boolean(approvalRequestId)}
          approvalRequestId={approvalRequestId}
          onSave={() => {}}
        />
      </DialogContent>

      <DialogActions>
        <Button
          onClick={handleClose}
          color="primary"
          variant="contained"
        >
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default AdminCreateItemForVendor;
