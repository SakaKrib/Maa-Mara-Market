import React, { useState } from "react";
import { Modal, Box, Button, TextField, MenuItem } from "@mui/material";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: 400,
  bgcolor: "background.paper",
  borderRadius: 2,
  boxShadow: 24,
  p: 4,
};

export default function AddPaymentModal({ open, onClose, onSubmit }) {
  const [form, setForm] = useState({
    category: "vendors",
    amount: "",
    payment_method: "mpesa",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = () => {
    onSubmit(form);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={style}>
        <h3>Add Payment</h3>

        <TextField
          select
          fullWidth
          label="Category"
          name="category"
          margin="normal"
          value={form.category}
          onChange={handleChange}
        >
          <MenuItem value="vendors">Vendors</MenuItem>
          <MenuItem value="staffs">Staffs</MenuItem>
          <MenuItem value="kra">KRA Licenses</MenuItem>
          <MenuItem value="rent">Rent</MenuItem>
          <MenuItem value="subscriptions">Subscriptions</MenuItem>
          <MenuItem value="training">Training</MenuItem>
          <MenuItem value="refund">Refund</MenuItem>
        </TextField>

        <TextField
          fullWidth
          label="Amount (KES)"
          name="amount"
          type="number"
          margin="normal"
          value={form.amount}
          onChange={handleChange}
        />

        <TextField
          select
          fullWidth
          label="Payment Method"
          name="payment_method"
          margin="normal"
          value={form.payment_method}
          onChange={handleChange}
        >
          <MenuItem value="mpesa">M-Pesa</MenuItem>
          <MenuItem value="paypal">PayPal</MenuItem>
        </TextField>

        <Button
          fullWidth
          variant="contained"
          sx={{ mt: 2 }}
          onClick={handleSubmit}
        >
          Save Payment
        </Button>
      </Box>
    </Modal>
  );
}
