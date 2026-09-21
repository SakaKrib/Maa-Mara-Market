import React, { useState } from "react";
import api from "../../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";

const Alert = React.forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

const VendorRatingForm = ({ vendorId, onRated, hasReviews = false }) => {
  const [vendorRatingForm, setVendorRatingForm] = useState({
    quality: 0,
    communication: 0,
    shipping: 0,
  });
  const [comment, setComment] = useState("");
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbarClose = () =>
    setSnackbar((prev) => ({ ...prev, open: false }));

  const handleSubmitVendorRating = async (event) => {
    event.preventDefault();

    if (
      vendorRatingForm.quality < 1 ||
      vendorRatingForm.communication < 1 ||
      vendorRatingForm.shipping < 1
    ) {
      setSnackbar({
        open: true,
        message: "Please rate quality, communication, and shipping.",
        severity: "warning",
      });
      return;
    }

    try {
      setVendorSubmitting(true);

      await api.post(
        `/api/rate-V/${vendorId}/rate/`,
        { ...vendorRatingForm, comment: comment.trim() },
        { withCredentials: true }
      );

      setSnackbar({
        open: true,
        message: "Shop review submitted!",
        severity: "success",
      });

      setVendorRatingForm({
        quality: 0,
        communication: 0,
        shipping: 0,
      });
      setComment("");
      setShowVendorForm(false);

      if (onRated) {
        await onRated();
      }
    } catch (error) {
      console.error("Failed to submit shop review:", error);

      setSnackbar({
        open: true,
        message:
          error?.response?.data?.error ||
          "Failed to submit shop review. Please try again.",
        severity: "error",
      });
    } finally {
      setVendorSubmitting(false);
    }
  };

  return (
    <div className="mt-5 border-t border-border pt-5">
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <div className="rounded-2xl border border-border bg-background p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h4 className="text-sm font-bold text-card-foreground sm:text-base">
              {hasReviews
                ? "Share your experience with this shop"
                : "Be the first to write a review about this shop"}
            </h4>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Rate the shop's quality, communication, and shipping, then tell
              other shoppers about your experience.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setShowVendorForm((open) => !open)}
            className="flex w-full items-center justify-center rounded-full border border-gray-300 bg-background px-4 py-2.5 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted sm:w-auto"
          >
            {showVendorForm ? "Close review form" : "Write a shop review"}
          </button>
        </div>

        {showVendorForm && (
          <form
            onSubmit={handleSubmitVendorRating}
            className="mt-4 space-y-4 border-t border-border pt-4"
          >
            <div className="grid gap-3 sm:grid-cols-3">
              {["quality", "communication", "shipping"].map((key) => (
                <label key={key} className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold capitalize text-card-foreground">
                    {key}
                  </span>
                  <select
                    value={vendorRatingForm[key]}
                    onChange={(event) =>
                      setVendorRatingForm((prev) => ({
                        ...prev,
                        [key]: Number.parseInt(event.target.value, 10),
                      }))
                    }
                    className="rounded-full border border-border bg-card px-3 py-2 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-border"
                  >
                    <option value={0}>Select rating</option>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <option key={star} value={star}>
                        {star} Star{star > 1 ? "s" : ""}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>

            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-card-foreground">
                Review (optional)
              </span>
              <textarea
                value={comment}
                onChange={(event) => setComment(event.target.value)}
                placeholder="Tell shoppers about your experience with this shop..."
                rows={4}
                className="w-full rounded-2xl border border-border bg-card px-3 py-2.5 text-sm text-card-foreground outline-none focus:ring-2 focus:ring-border"
              />
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={vendorSubmitting}
                className="w-full rounded-full bg-black px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
              >
                {vendorSubmitting ? "Submitting..." : "Submit shop review"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default VendorRatingForm;
