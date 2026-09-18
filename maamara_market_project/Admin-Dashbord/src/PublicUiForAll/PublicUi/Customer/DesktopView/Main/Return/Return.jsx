import React, { useState } from "react";
import api from "../../../../../../Services/Api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "../../../../../../../components/ui/card";
import { Button } from "../../../../../../../components/ui/button";
import { Input } from "../../../../../../../components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../../../../components/ui/select";
import { Textarea } from "../../../../../../../components/ui/textarea";
import { Label } from "../../../../../../../components/ui/label";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import { Link } from "react-router-dom";

const RequestReturnForm = ({ selectedItem }) => {
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [preference, setPreference] = useState("refund");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");


  // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("success");

  const token = localStorage.getItem("accessToken");

  const reasonOptions = [
    { value: "damaged", label: "The item was delivered broken." },
    { value: "not exact", label: "Not the exact item I expected." },
    { value: "missing", label: "The item is missing." },
    { value: "rejected", label: "I've changed my mind — I don’t want it anymore." },
    { value: "get something else", label: "I want to get something else instead." },
    { value: "broken", label: "I broke the item unknowingly. Can it be fixed?" },
    { value: "dont want to explain", label: "I don’t want to explain!" },
    { value: "custom", label: "Other (write your own reason)" },
  ];

  console.log(selectedItem)

  const preferenceOptions = [
    { value: "refund", label: "Refund" },
    { value: "exchange", label: "Exchange" },
  ];

  const handleCloseSnackbar = (_, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedItem?.id) {
      setError("Invalid item selected for return.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

   

    const finalReason = reason === "custom" ? customReason : reason;
    if (!finalReason) {
      setError("Please select or write a reason for return.");
      setSnackbarSeverity("warning");
      setSnackbarOpen(true);
      setLoading(false);
      return;
    }

    const formData = new FormData();
    formData.append("reason", finalReason);
    formData.append("customer_preference", preference);
    formData.append("description", description);
    formData.append("item_id", selectedItem.id); // ✅ Include selected item ID
    if (image) formData.append("image", image);

    try {
      const res = await api.post(`/api/returns-request/${selectedItem.id}/`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        withCredentials: true
      });

      if (res.data.success) {
        setMessage("✅ Return request submitted successfully.");
        setSnackbarSeverity("success");
        setSnackbarOpen(true);
        setReason("");
        setCustomReason("");
        setDescription("");
        setImage(null);
      } else {
        const errMsg = res.data.errors
          ? JSON.stringify(res.data.errors)
          : "Failed to submit return request.";
        setError(errMsg);
        setSnackbarSeverity("error");
        setSnackbarOpen(true);
      }
    } catch (err) {
      console.error("Return request error:", err);
      setError(err.response?.data?.error || "An unexpected error occurred.");
      setSnackbarSeverity("error");
      setSnackbarOpen(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div>
      <h5 className="text-lg border-b p-2">Return policy</h5>
      <p className="text-gray-600 mt-4 text-sm">
  <strong className='text-gray-500'>We take great pride</strong> in our handmade creations — each piece is uniquely crafted, meaning slight variations in size, color, or shape are part of their natural charm. We want you to love your purchase, but if you’re not completely satisfied, we accept returns and exchanges within <strong className='text-gray-500'>2 weeks</strong> of purchase. To be eligible, the item must be in the <strong className='text-gray-500'>same quality and condition</strong> as when it was received — unused, unwashed, and in its original packaging. Because our products are handmade, these small differences are what make them special and are not considered defects. Please note that <strong className='text-gray-500'>shipping costs for returns are the customer’s responsibility</strong> and will be <strong className='text-gray-500'>deducted from your refund</strong>. We only process refunds or exchanges <strong className='text-gray-500'>after confirming that the item has been returned</strong> to the shipping company or our dispatch center. <strong className='text-gray-500'>Our goal is to make every experience delightful</strong>, so if you have any questions or concerns, our friendly team is always happy to help. <br /> <Link className="hover:underline cursor-pointer hover:text-blue-500 text-blue-700" to='return-policy'> Return Policy</Link> to find out more.
</p>

    </div>
      <Card className="max-w-md mx-auto shadow-md border rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-800">
            Request a Return
          </CardTitle>
          {selectedItem && (
            <div className="text-sm text-gray-600 mt-1">
              <p>
                <strong>Item:</strong> {selectedItem.item.name || selectedItem.title || "Unnamed item"}
              </p>
             {selectedItem.item.discount_price ? (
                <p>
                <strong>Price:</strong> ${selectedItem.item.final_discounted_price}
              </p>
             ) : (
                <p>
                  <strong>Price:</strong> ${selectedItem.item.get_final_price}
                </p>
             )}
                
            
            </div>
          )}
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Reason */}
            <div className="space-y-1">
              <Label>Reason</Label>
              <Select onValueChange={setReason} value={reason}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {reasonOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {reason === "custom" && (
              <div className="space-y-1">
                <Label>Describe your reason</Label>
                <Input
                  type="text"
                  value={customReason}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Write your reason here..."
                  required
                />
              </div>
            )}

            {/* Preference */}
            <div className="space-y-1">
              <Label>What would you like to do?</Label>
              <Select onValueChange={setPreference} value={preference}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a preference" />
                </SelectTrigger>
                <SelectContent>
                  {preferenceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Additional details</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add any other information here..."
              />
            </div>

            {/* Image Upload */}
            <div className="space-y-1">
              <Label>Upload an image (optional)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setImage(e.target.files[0])}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Submitting..." : "Submit Return Request"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Snackbar */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <MuiAlert
          onClose={handleCloseSnackbar}
          severity={snackbarSeverity}
          elevation={6}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {error || message}
        </MuiAlert>
      </Snackbar>
    </>
  );
};

export default RequestReturnForm;
