import React, { useEffect, useState } from "react";
import api from "../../../Services/Api";
import { Button } from "../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../components/ui/card";
import VendorRequestDetails from "./VendorRequestDetails";
import VendorEditForm from "./VendorEditForm";
import VendorItemList from "./VendorItemList";
import ItemAddNew from "../Products/Forms/AddingNewItem";

export default function VendorApprovalPanel() {
  const [vendorRequests, setVendorRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [view, setView] = useState("requests");
  const [editVendorInfo, setEditVendorInfo] = useState({});
  const [editItemList, setEditItemList] = useState([]);
  const [editingItemIndex, setEditingItemIndex] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    title: "",
    description: "",
  });

  const showSnackbar = ({ title = "", description = "" }) => {
    setSnackbar({ open: true, title, description });
    setTimeout(() => {
      setSnackbar((prev) => ({ ...prev, open: false }));
    }, 3000);
  };

  const handleCloseSnackbar = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  useEffect(() => {
    fetchVendorRequests();
  }, []);

  const fetchVendorRequests = async () => {
    try {
      const response = await api.get("/api/vendor/requests?status=verified");
      setVendorRequests(response.data);
    } catch (error) {
      showSnackbar({
        title: "Error",
        description: "Failed to load vendor requests.",
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (id, vendorInfo = editVendorInfo, itemList = editItemList) => {
    setLoading(true);
    const dataToUpdate = { ...vendorInfo, item_list: itemList };
    const cleanedData = { ...dataToUpdate };
    delete cleanedData.confirm_password;

    try {
      await api.post(`/api/vendor-requests/${id}/approve/`, cleanedData);
      showSnackbar({
        title: "Vendor Approved",
        description: "Vendor and item list saved successfully.",
      });
      await fetchVendorRequests();
      resetWorkspace();
    } catch (error) {
      showSnackbar({
        title: "Error",
        description: error.response?.data?.error || "Approval failed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (id) => {
    setLoading(true);
    try {
      await api.post(`/api/vendor/deny/${id}/`);
      showSnackbar({
        title: "Vendor Denied",
        description: "Vendor request has been denied.",
      });
      await fetchVendorRequests();
      resetWorkspace();
    } catch (error) {
      showSnackbar({
        title: "Error",
        description: error.response?.data?.error || "Denial failed.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (vendor) => {
    setSelectedVendor(vendor);
    setEditVendorInfo(vendor.vendor_data || {});
    setEditItemList(vendor.item_list || []);
    setEditingItemIndex(null);
    setView("details");
  };

  const resetWorkspace = () => {
    setSelectedVendor(null);
    setEditVendorInfo({});
    setEditItemList([]);
    setEditingItemIndex(null);
    setView("requests");
  };

  const handleEditVendor = () => {
    setEditVendorInfo(selectedVendor?.vendor_data || {});
    setView("vendor-edit");
  };

  const handleSaveVendor = async () => {
    if (!selectedVendor) return;
    setLoading(true);

    try {
      const response = await api.put(
        `/api/vendor-requests/${selectedVendor.id}/update-vendor-info/`,
        { vendor_data: editVendorInfo },
        { withCredentials: true }
      );

      const updatedVendor = {
        ...selectedVendor,
        vendor_data: response.data.vendor_data,
      };

      setSelectedVendor(updatedVendor);
      setVendorRequests((prev) =>
        prev.map((vendor) =>
          vendor.user === selectedVendor.user ? updatedVendor : vendor
        )
      );
      showSnackbar({ title: "Vendor info updated successfully." });
      setView("details");
    } catch (error) {
      showSnackbar({
        title: "Error",
        description: "Something went wrong while updating vendor.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditItems = () => {
    setEditItemList(selectedVendor?.item_list || []);
    setEditingItemIndex(null);
    setView("items");
  };

  const handleSaveEditedItem = (updatedItem) => {
    if (editingItemIndex === null) return;
    const updatedList = [...editItemList];
    updatedList[editingItemIndex] = updatedItem;
    setEditItemList(updatedList);
    setSelectedVendor((current) =>
      current ? { ...current, item_list: updatedList } : current
    );
    setEditingItemIndex(null);
    setView("items");
  };

  return (
    <>
      {snackbar.open && (
        <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
          {snackbar.title && <div>{snackbar.title}</div>}
          {snackbar.description && (
            <div className="mt-1 text-sm font-normal text-card-foreground">
              {snackbar.description}
            </div>
          )}
          <button
            type="button"
            onClick={handleCloseSnackbar}
            className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
            aria-label="Dismiss notification"
          >
            ×
          </button>
        </div>
      )}

      <div className="min-w-0 space-y-4">
      {view === "requests" && (
        <>
          {vendorRequests.length === 0 ? (
            <div className="rounded-[12px] border border-border bg-muted/40 p-2 text-center">
              <p className="text-sm font-medium text-card-foreground">
                No vendor requests awaiting approval.
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                New verified vendor applications will appear here.
              </p>
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              {vendorRequests.map((vendor, index) => (
                <Card
                  key={vendor.id ?? index}
                  className="overflow-hidden rounded-[12px] border border-border bg-card shadow-sm"
                >
                  <CardHeader className="border-b border-border p-2">
                    <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <CardTitle className="truncate text-base font-bold text-card-foreground">
                          {vendor.vendor_data?.company_name ||
                            vendor.user?.email ||
                            "Vendor application"}
                        </CardTitle>
                        <p className="mt-1 truncate text-xs text-muted-foreground">
                          {vendor.user?.email || `User ID: ${vendor.user}`}
                        </p>
                      </div>
                      <span className="inline-flex w-fit shrink-0 items-center rounded-[12px] border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {vendor.status || "Pending"}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="p-2">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="rounded-[12px] border border-border bg-muted/50 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Account
                        </p>
                        <p className="mt-1 break-all text-sm font-medium text-card-foreground">
                          {vendor.user?.email || `User ID: ${vendor.user}`}
                        </p>
                      </div>
                      <div className="rounded-[12px] border border-border bg-muted/50 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Application
                        </p>
                        <p className="mt-1 text-sm font-medium text-card-foreground">
                          Vendor registration
                        </p>
                      </div>
                    </div>

                    <div className="mt-2 grid gap-2 sm:grid-cols-3">
                      <Button
                        disabled={loading}
                        onClick={() =>
                          handleApprove(
                            vendor.id,
                            vendor.vendor_data || {},
                            vendor.item_list || []
                          )
                        }
                        className="w-full rounded-[12px] bg-blue-600 px-2 py-2 text-white hover:bg-blue-700"
                      >
                        Approve
                      </Button>
                      <Button
                        variant="destructive"
                        disabled={loading}
                        onClick={() => handleDeny(vendor.id)}
                        className="w-full rounded-[12px] px-2 py-2"
                      >
                        Deny
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleViewDetails(vendor)}
                        className="w-full rounded-[12px] border-border bg-card px-2 py-2 text-foreground hover:bg-muted"
                      >
                        View details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {view === "details" && selectedVendor && (
        <VendorRequestDetails
          vendor={selectedVendor}
          loading={loading}
          onEditVendor={handleEditVendor}
          onEditItems={handleEditItems}
          onApprove={() => handleApprove(selectedVendor.id)}
          onDeny={() => handleDeny(selectedVendor.user)}
          onBack={resetWorkspace}
        />
      )}

      {view === "vendor-edit" && selectedVendor && (
        <VendorEditForm
          vendor={selectedVendor}
          value={editVendorInfo}
          loading={loading}
          onChange={setEditVendorInfo}
          onSave={handleSaveVendor}
          onCancel={() => setView("details")}
        />
      )}

      {view === "items" && selectedVendor && editingItemIndex === null && (
        <VendorItemList
          items={editItemList}
          onEdit={setEditingItemIndex}
          onBack={() => setView("details")}
        />
      )}

      {view === "items" && selectedVendor && editingItemIndex !== null && (
        <section className="min-w-0 space-y-3 rounded-[12px] border border-border bg-card p-2 text-card-foreground">
          <div className="flex flex-col gap-2 border-b border-border pb-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                Marketplace
              </p>
              <h2 className="text-base font-bold">Edit item</h2>
              <p className="text-xs text-muted-foreground">
                Update the item details, pricing, inventory, and image before approval.
              </p>
            </div>
            <Button
              onClick={() => setEditingItemIndex(null)}
              variant="outline"
              className="w-full rounded-[12px] border-border bg-transparent px-2 py-2 text-foreground hover:bg-muted sm:w-auto"
            >
              Back
            </Button>
          </div>

          <div className="min-w-0">
            <ItemAddNew
              vendorId={selectedVendor.id}
              vendor={selectedVendor}
              initialItem={editItemList[editingItemIndex]}
              onSave={handleSaveEditedItem}
            />
          </div>
        </section>
      )}
      </div>
    </>
  );
}
