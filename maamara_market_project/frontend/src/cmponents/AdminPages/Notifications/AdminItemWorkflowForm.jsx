import React from "react";
import AdminCreateVendorItemForm from "./AdminCreateVendorItemForm";
import AdminApproveVendorRequestForm from "./AdminApproveVendorRequestForm";
import AdminEditVendorItemForm from "./AdminEditVendorItemForm";

export default function AdminItemWorkflowForm({
  workflow = "create",
  request = null,
  initialItem = null,
  vendor = null,
  vendorId = null,
  itemId = null,
  onSave = () => {},
  ...rest
}) {
  const normalizedWorkflow = String(workflow || "create").trim().toLowerCase();

  if (normalizedWorkflow === "approve") {
    return (
      <AdminApproveVendorRequestForm
        request={request}
        vendor={vendor}
        onSave={onSave}
        {...rest}
      />
    );
  }

  if (normalizedWorkflow === "edit") {
    return (
      <AdminEditVendorItemForm
        initialItem={initialItem}
        vendor={vendor}
        vendorId={vendorId}
        itemId={itemId}
        onSave={onSave}
        {...rest}
      />
    );
  }

  return (
    <AdminCreateVendorItemForm
      vendor={vendor}
      vendorId={vendorId}
      onSave={onSave}
      {...rest}
    />
  );
}
