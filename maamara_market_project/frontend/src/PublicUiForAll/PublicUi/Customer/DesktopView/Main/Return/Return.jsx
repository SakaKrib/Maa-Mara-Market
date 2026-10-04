import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../../../Services/Api";
import { Button } from "../../../../../../../components/ui/button";
import { Loader2, PackageCheck, UploadCloud, Undo2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const reasonOptions = [
  { value: "damaged", label: "The item was delivered broken." },
  { value: "not_exact", label: "Not the exact item I expected." },
  { value: "missing", label: "The item is missing." },
  { value: "rejected", label: "I've changed my mind — I don't want it anymore." },
  { value: "get_something_else", label: "I want to get something else instead." },
  { value: "broken", label: "I broke the item unknowingly. Can it be fixed?" },
  { value: "dont_want_to_explain", label: "I don't want to explain." },
  { value: "custom", label: "Other (write your own reason)" },
];

const RequestReturnForm = ({ selectedItem = null }) => {
  const location = useLocation();
  const routeSelectedItem = location.state?.selectedItem || null;
  const initialSelectedItem = selectedItem || routeSelectedItem;
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState(initialSelectedItem?.order?.id ? String(initialSelectedItem.order.id) : "");
  const [itemId, setItemId] = useState(initialSelectedItem?.id ? String(initialSelectedItem.id) : "");
  const [reason, setReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [preference, setPreference] = useState("refund");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  useEffect(() => {
    let active = true;
    api.get("/api/user/account/", { withCredentials: true })
      .then(({ data }) => {
        if (!active) return;
        const completed = (data?.orders || []).filter(
          (order) => String(order.status || "").toLowerCase() === "completed"
        );
        setOrders(completed);
      })
      .catch((error) => {
        console.error("Unable to load completed orders:", error);
        if (active) {
          setSnackbar({
            open: true,
            severity: "error",
            message: "We could not load your completed orders.",
          });
        }
      })
      .finally(() => {
        if (active) setLoadingOrders(false);
      });
    return () => { active = false; };
  }, []);

  const selectedOrder = useMemo(
    () => orders.find((order) => String(order.id) === String(orderId)),
    [orders, orderId]
  );

  const selectedOrderItem = useMemo(
    () =>
      selectedOrder?.items?.find((orderItem) => String(orderItem.id) === String(itemId)) ||
      (selectedItem?.id && String(initialSelectedItem.id) === String(itemId) ? initialSelectedItem : null),
    [selectedOrder, itemId, selectedItem]
  );

  const availableItems = selectedOrder?.items || [];

  const showMessage = (message) =>
    setSnackbar({ open: true, message });

  const resetForm = () => {
    setReason("");
    setCustomReason("");
    setPreference("refund");
    setDescription("");
    setImage(null);
    const fileInput = document.getElementById("return-image");
    if (fileInput) fileInput.value = "";
  };

  const handleOrderChange = (value) => {
    setOrderId(value);
    setItemId("");
    setReason("");
    setCustomReason("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedOrder) {
      showMessage("Please select a completed order before requesting a return.");
      return;
    }

    if (!selectedOrderItem?.id) {
      showMessage("Please select the item you want to return.");
      return;
    }

    if (String(selectedOrder.status).toLowerCase() !== "completed") {
      showMessage("Only completed orders are eligible for returns.");
      return;
    }

    const finalReason = reason === "custom" ? customReason.trim() : reason;
    if (!finalReason) {
      showMessage("Please select or provide a reason for the return.", "warning");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("reason", reason);
      formData.append("custom_reason", reason === "custom" ? finalReason : "");
      formData.append("customer_preference", preference);
      formData.append("description", description.trim());
      formData.append("item_id", String(selectedOrderItem.id));
      if (image) formData.append("image", image);

      const response = await api.post(
        `/api/returns-request/${selectedOrderItem.id}/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" }, withCredentials: true }
      );

      if (response.data?.success) {
        showMessage(
          response.data.message || "Your return request has been submitted.");
        resetForm();
      } else {
        showMessage(response.data?.error || "The return request could not be submitted.");
      }
    } catch (error) {
      console.error("Return request error:", error);
      const message =
        error.response?.data?.error ||
        error.response?.data?.errors?.item?.[0] ||
        "The return request could not be submitted. Please try again.";
      showMessage(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mm-return-page">
      <div className="mm-return-shell">
        <section className="mm-return-intro">
          <p className="mm-return-eyebrow">Returns & exchanges</p>
          <h1 className="mm-return-title">Return Policy</h1>
          <p className="mm-return-lead">
            We take great pride in our handmade creations. If you are not completely
            satisfied, eligible returns and exchanges can be requested within <strong>2 weeks</strong> of purchase.
          </p>

          <div className="mm-return-policy-grid">
            <div>
              <h2>Eligibility</h2>
              <p>
                The item must be in the same quality and condition as when it was received:
                unused, unwashed, and in its original packaging.
              </p>
            </div>
            <div>
              <h2>Important</h2>
              <p>
                Shipping costs for returns are the customer's responsibility and will be
                deducted from the refund. Refunds or exchanges are processed after the
                returned item has been confirmed.
              </p>
            </div>
          </div>

          <p className="mm-return-note">
            Handmade items can have small variations in size, colour, or shape. These
            natural differences are part of their character and are not considered defects.
          </p>
        </section>

        <section className="mm-return-card">
          <div className="mm-return-card-header">
            <div>
              <p className="mm-return-eyebrow">Request a return</p>
              <h2>Select your purchase</h2>
              <p>Returns can only be submitted for a completed, paid order.</p>
            </div>
            <PackageCheck aria-hidden="true" />
          </div>

          {loadingOrders ? (
            <div className="mm-return-state">
              <Loader2 className="animate-spin" />
              <span>Loading your completed orders…</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="mm-return-empty">
              <PackageCheck aria-hidden="true" />
              <h3>No completed orders available</h3>
              <p>
                You need a completed order before you can request a refund or exchange.
                Your eligible purchases will appear here after checkout is completed.
              </p>
              <Link to="/customer-order" className="mm-return-secondary-button">
                View Order History
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mm-return-form">
              <div className="mm-return-field">
                <label htmlFor="return-order">Completed order</label>
                <select
                  id="return-order"
                  className="mm-return-input"
                  value={orderId}
                  onChange={(event) => handleOrderChange(event.target.value)}
                  required
                >
                  <option value="">Select a completed order</option>
                  {orders.map((order) => (
                    <option key={order.id} value={order.id}>
                      Order #{order.paypal_order_id || order.id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mm-return-field">
                <label htmlFor="return-item">Item to return</label>
                <select
                  id="return-item"
                  className="mm-return-input"
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  disabled={!selectedOrder}
                  required
                >
                  <option value="">
                    {selectedOrder ? "Select an item from this order" : "Select an order first"}
                  </option>
                  {availableItems.map((orderItem) => (
                    <option key={orderItem.id} value={orderItem.id}>
                      {orderItem.item?.name || `Item #${orderItem.id}`} · Qty {orderItem.quantity}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOrderItem && (
                <div className="mm-return-selected">
                  <div>
                    <span>Selected item</span>
                    <strong>{selectedOrderItem.item?.name || "Unnamed item"}</strong>
                  </div>
                  <div>
                    <span>Quantity</span>
                    <strong>{selectedOrderItem.quantity}</strong>
                  </div>
                </div>
              )}

              <div className="mm-return-field">
                <label htmlFor="return-reason">Reason for return</label>
                <select
                  id="return-reason"
                  className="mm-return-input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={!selectedOrderItem}
                  required
                >
                  <option value="">Select a reason</option>
                  {reasonOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {reason === "custom" && (
                <div className="mm-return-field">
                  <label htmlFor="custom-reason">Your reason</label>
                  <input
                    id="custom-reason"
                    className="mm-return-input"
                    value={customReason}
                    onChange={(event) => setCustomReason(event.target.value)}
                    placeholder="Tell us why you are returning the item"
                    required
                  />
                </div>
              )}

              <div className="mm-return-field">
                <label htmlFor="return-preference">What would you like?</label>
                <select
                  id="return-preference"
                  className="mm-return-input"
                  value={preference}
                  onChange={(event) => setPreference(event.target.value)}
                  disabled={!selectedOrderItem}
                >
                  <option value="refund">Refund</option>
                  <option value="exchange">Exchange</option>
                </select>
              </div>

              <div className="mm-return-field">
                <label htmlFor="return-details">Additional details <span>(optional)</span></label>
                <textarea
                  id="return-details"
                  className="mm-return-input mm-return-textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add any details that will help us understand the issue."
                  rows={5}
                  disabled={!selectedOrderItem}
                />
              </div>

              <div className="mm-return-field">
                <label htmlFor="return-image">Photo <span>(optional)</span></label>
                <label htmlFor="return-image" className="mm-return-upload">
                  <UploadCloud aria-hidden="true" />
                  <span>{image ? image.name : "Upload a photo of the item"}</span>
                </label>
                <input
                  id="return-image"
                  type="file"
                  accept="image/*"
                  className="mm-return-file"
                  onChange={(event) => setImage(event.target.files?.[0] || null)}
                  disabled={!selectedOrderItem}
                />
                <small>Optional. A clear photo can help us review damaged or incorrect items.</small>
              </div>

              <Button
                type="submit"
                className="mm-return-submit"
                disabled={loading || !selectedOrderItem}
              >
                {loading ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Submitting…
                  </>
                ) : (
                  <>
                    <Undo2 />
                    Submit Return Request
                  </>
                )}
              </Button>
            </form>
          )}
        </section>
      </div>

      {snackbar.open && (<div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">{snackbar.message}<button type="button" onClick={() => setSnackbar((previous) => ({ ...previous, open: false }))} className="ml-3 text-xs text-muted-foreground hover:text-card-foreground" aria-label="Dismiss notification">×</button></div>)}
    </main>
  );
};

export default RequestReturnForm;
