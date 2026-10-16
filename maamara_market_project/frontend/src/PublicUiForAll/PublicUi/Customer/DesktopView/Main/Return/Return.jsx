import React, { useEffect, useMemo, useState } from "react";
import api from "../../../../../../Services/Api";
import { downloadFile } from "../../../../../../Services/DownloadFile";
import { Button } from "../../../../../../../components/ui/button";
import { Download, Loader2, PackageCheck, UploadCloud, Undo2 } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import NativeAwareSelect from "../../../../../../components/NativeAwareSelect";
import AppSnackbar from "../../../../../../../components/ui/app-snackbar";

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
  const [lastReturnRecord, setLastReturnRecord] = useState(null);
  const [returnHistory, setReturnHistory] = useState([]);
  const [loadingReturnHistory, setLoadingReturnHistory] = useState(true);

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

  useEffect(() => {
    let active = true;
    api.get("/api/returns/my/", { withCredentials: true })
      .then(({ data }) => {
        if (active) {
          const records = Array.isArray(data?.results)
            ? data.results
            : Array.isArray(data) ? data : [];
          setReturnHistory(records);
        }
      })
      .catch((error) => {
        console.error("Unable to load customer return history:", error);
      })
      .finally(() => {
        if (active) setLoadingReturnHistory(false);
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

  const downloadReturnRecord = async (record) => {
    if (!record) return;
    const rows = [
      ["MAA MARA MARKET — RETURN / EXCHANGE REQUEST"],
      ["Generated at (Africa/Nairobi)", new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })],
      ["Return request ID", record.id ?? record.return_request_id ?? ""],
      ["Order ID", record.order_id ?? ""],
      ["Item", record.item_name ?? "Purchased item"],
      ["Quantity", record.quantity ?? ""],
      ["Reason", record.custom_reason || record.reason || ""],
      ["Customer preference", record.customer_preference || ""],
      ["Status", record.status || "Submitted — awaiting review"],
      ["Description", record.description || ""],
      ["Refund amount (KES)", record.refund_amount ?? ""],
      ["Decision / response", record.admin_response || record.decision_note || ""],
    ];
    const csvCell = (value) => {
      const text = value == null ? "" : String(value);
      const safeText = /^[=+@-]/.test(text) ? `'${text}` : text;
      return '"' + safeText.replace(/"/g, '""') + '"';
    };
    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
    try {
      await downloadFile({
        filename: `maa-mara-return-request-${record.id ?? orderId ?? "record"}.csv`,
        content: "\uFEFF" + csv,
        mimeType: "text/csv;charset=utf-8;",
      });
    } catch (error) {
      console.error("Unable to export return record:", error);
      showMessage("We couldn't open the save/share sheet for this return record. Please try again.");
    }
  };

  const downloadReturnHistory = async () => {
    if (!returnHistory.length) return;
    const rows = [
      ["MAA MARA MARKET — CUSTOMER RETURN HISTORY"],
      ["Generated at (Africa/Nairobi)", new Date().toLocaleString("en-KE", { timeZone: "Africa/Nairobi" })],
      [],
      ["Return request ID", "Order ID", "Item", "Quantity", "Reason", "Preference", "Status", "Description", "Refund amount (KES)", "Decision / response", "Submitted at"],
      ...returnHistory.map((record) => [
        record.id ?? "",
        record.order_id ?? "",
        record.item_name ?? "Purchased item",
        record.quantity ?? "",
        record.custom_reason || record.reason || "",
        record.customer_preference || "",
        record.status || "pending",
        record.description || "",
        record.refund_amount ?? "",
        record.admin_response || record.decision_note || "",
        record.created_at ?? "",
      ]),
    ];
    const csvCell = (value) => {
      const text = value == null ? "" : String(value);
      const safeText = /^[=+@-]/.test(text) ? "'" + text : text;
      return '"' + safeText.replace(/"/g, '""') + '"';
    };
    try {
      await downloadFile({
        filename: `maa-mara-customer-return-history-${new Date().toISOString().slice(0, 10)}.csv`,
        content: "\uFEFF" + rows.map((row) => row.map(csvCell).join(",")).join("\\r\\n"),
        mimeType: "text/csv;charset=utf-8;",
      });
    } catch (error) {
      console.error("Unable to export customer return history:", error);
      showMessage("We couldn't open the save/share sheet for your return history. Please try again.");
    }
  };

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
        const returned = response.data.return_request || {};
        setLastReturnRecord({
          ...returned,
          id: returned.id ?? returned.return_request_id ?? response.data.return_request_id ?? "",
          order_id: selectedOrder.id,
          item_name:
            returned.item_name ||
            returned.item?.name ||
            selectedOrderItem.item?.name ||
            selectedOrderItem.name ||
            selectedOrderItem.item_name ||
            "Purchased item",
          quantity: returned.quantity ?? selectedOrderItem.quantity ?? "",
          reason:
            returned.custom_reason ||
            returned.reason ||
            (reason === "custom" ? finalReason : reason),
          customer_preference: returned.customer_preference || preference,
          status:
            returned.status ||
            response.data.message ||
            "Submitted — awaiting review",
          description: returned.description || description.trim(),
          refund_amount: returned.refund_amount ?? response.data.refund_amount ?? "",
          admin_response: returned.admin_response || returned.decision_note || "",
        });
        showMessage(response.data.message || "Your return request has been submitted.");
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
        {lastReturnRecord && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-blue-900">Return request submitted</p>
              <p className="text-sm text-blue-800">Keep a copy of your request details for your records.</p>
            </div>
            <Button type="button" variant="outline" className="rounded-full" onClick={() => downloadReturnRecord(lastReturnRecord)}>
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download return record
            </Button>
          </div>
        )}
        <section className="mm-return-card mb-4">
          <div className="mm-return-card-header">
            <div>
              <p className="mm-return-eyebrow">Your records</p>
              <h2>Return history</h2>
              <p>
                {loadingReturnHistory
                  ? "Loading your previous return requests…"
                  : `${returnHistory.length} return request${returnHistory.length === 1 ? "" : "s"} on record.`}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={downloadReturnHistory}
              disabled={loadingReturnHistory || returnHistory.length === 0}
            >
              <Download className="mr-2 h-4 w-4" aria-hidden="true" />
              Download return history
            </Button>
          </div>
          {!loadingReturnHistory && returnHistory.length === 0 && (
            <p className="text-sm text-muted-foreground">Your submitted return requests will appear here.</p>
          )}
        </section>
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
                <NativeAwareSelect
                  id="return-order"
                  aria-label="Completed order"
                  className="mm-return-input"
                  value={orderId}
                  onChange={(event) => handleOrderChange(event.target.value)}
                  required
                  placeholder="Select a completed order"
                  options={[
                    { value: "", label: "Select a completed order" },
                    ...orders.map((order) => ({ value: order.id, label: `Order #${order.paypal_order_id || order.id}` })),
                  ]}
                />
              </div>

              <div className="mm-return-field">
                <label htmlFor="return-item">Item to return</label>
                <NativeAwareSelect
                  id="return-item"
                  aria-label="Item to return"
                  className="mm-return-input"
                  value={itemId}
                  onChange={(event) => setItemId(event.target.value)}
                  disabled={!selectedOrder}
                  required
                  placeholder={selectedOrder ? "Select an item from this order" : "Select an order first"}
                  options={[
                    { value: "", label: selectedOrder ? "Select an item from this order" : "Select an order first" },
                    ...availableItems.map((orderItem) => ({
                      value: orderItem.id,
                      label: `${orderItem.item?.name || `Item #${orderItem.id}`} · Qty ${orderItem.quantity}`,
                    })),
                  ]}
                />
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
                <NativeAwareSelect
                  id="return-reason"
                  aria-label="Reason for return"
                  className="mm-return-input"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                  disabled={!selectedOrderItem}
                  required
                  placeholder="Select a reason"
                  options={[
                    { value: "", label: "Select a reason" },
                    ...reasonOptions,
                  ]}
                />
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
                <NativeAwareSelect
                  id="return-preference"
                  aria-label="What would you like?"
                  className="mm-return-input"
                  value={preference}
                  onChange={(event) => setPreference(event.target.value)}
                  disabled={!selectedOrderItem}
                  options={[
                    { value: "refund", label: "Refund" },
                    { value: "exchange", label: "Exchange" },
                  ]}
                />
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

      <AppSnackbar open={snackbar.open} message={snackbar.message} severity={snackbar.severity} onClose={() => setSnackbar((previous) => ({ ...previous, open: false }))} />
    </main>
  );
};

export default RequestReturnForm;
