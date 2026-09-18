import React, { useState, useEffect } from "react";
import api from "../../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Button from "@mui/material/Button";

// MUI Alert wrapper
const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const VendorRatingForm = ({ vendorId, authToken, onRated }) => {
  const [vendorRatingForm, setVendorRatingForm] = useState({
    quality: 0,
    communication: 0,
    shipping: 0,
    comment: "",
  });
  const [comment, setComment] = useState(""); 
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  // For comments dialog
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [vendorComments, setVendorComments] = useState([]);

  const handleSnackbarClose = () => setSnackbar(prev => ({ ...prev, open: false }));

  const handleSubmitVendorRating = async (e) => {
    e.preventDefault();
    try {
      setVendorSubmitting(true);
      await api.post(
        `/api/rate-V/${vendorId}/rate/`,
        { ...vendorRatingForm, comment },
        { withCredentials: true }
      );
      setSnackbar({ open: true, message: "Vendor rating submitted!", severity: "success" });
      setVendorRatingForm({ quality: 0, communication: 0, shipping: 0 });
      setComment("");
      setShowVendorForm(false);
      onRated && onRated();
    } catch (err) {
      console.error(err);
      setSnackbar({ open: true, message: "Failed to submit vendor rating.", severity: "error" });
    } finally {
      setVendorSubmitting(false);
    }
  };

  // Fetch vendor comments
  const fetchVendorComments = async () => {
    try {
      const response = await api.get(`/api/rate-V/${vendorId}/rate/`); // make sure GET is allowed
      const comments = response.data?.comments || []; // adjust depending on your backend response
      setVendorComments(comments.filter(c => c.comment && c.comment.trim() !== ""));
      setCommentsOpen(true);
    } catch (err) {
      console.error("Failed to fetch vendor comments", err);
      setSnackbar({ open: true, message: "Failed to load comments.", severity: "error" });
    }
  };

  return (
    <div className="space-y-4">
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

      {/* Toggle Vendor Rating Form */}
      <button
        className="bg-gray-200 px-3 py-1 rounded"
        onClick={() => setShowVendorForm(prev => !prev)}
      >
        {showVendorForm ? "Close Vendor Rating" : "Rate this Shop"}
      </button>

      {/* View Comments Button */}
      <button
        className="bg-blue-200 px-3 py-1 rounded ml-2"
        onClick={fetchVendorComments}
      >
        View Comments
      </button>

      {/* Vendor Rating Form */}
      {showVendorForm && (
        <form
          onSubmit={handleSubmitVendorRating}
          className="space-y-4 mt-2 p-4 border rounded max-w-md"
        >
          {["quality", "communication", "shipping"].map((key) => (
            <div key={key} className="flex items-center gap-2">
              <span className="capitalize w-32">{key}</span>
              <select
                value={vendorRatingForm[key]}
                onChange={(e) =>
                  setVendorRatingForm((prev) => ({
                    ...prev,
                    [key]: parseInt(e.target.value),
                  }))
                }
                className="border rounded px-2 py-1"
              >
                {[1, 2, 3, 4, 5].map((star) => (
                  <option key={star} value={star}>
                    {star} Star{star > 1 && "s"}
                  </option>
                ))}
              </select>
            </div>
          ))}

          {/* Optional Comment */}
          <div>
            <label className="block font-medium mb-1">Comment (optional):</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Write a comment..."
              className="w-full border rounded px-3 py-2"
              rows={3}
            />
          </div>

          <button
            type="submit"
            disabled={vendorSubmitting}
            className="bg-black text-white py-2 px-4 rounded hover:bg-gray-800 disabled:opacity-50"
          >
            {vendorSubmitting ? "Submitting..." : "Submit Vendor Rating"}
          </button>
        </form>
      )}

      {/* Comments Dialog */}
      <Dialog open={commentsOpen} onClose={() => setCommentsOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Vendor Comments</DialogTitle>
        <DialogContent dividers>
          {vendorComments.length === 0 ? (
            <p>No comments yet.</p>
          ) : (
            <ul className="space-y-2">
              {vendorComments.map((c, idx) => (
                <li key={idx} className="border-b pb-2">{c.comment}</li>
              ))}
            </ul>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCommentsOpen(false)} color="primary">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default VendorRatingForm;
