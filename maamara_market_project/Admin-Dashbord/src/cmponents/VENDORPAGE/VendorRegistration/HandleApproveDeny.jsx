import React, { useEffect, useState } from 'react';
import api, { resolveApiAssetUrl } from '../../../Services/Api';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { useToast } from '../../../../components/ui/toast';
import { Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import ItemAddNew from '../Products/Forms/AddingNewItem';
import { ScrollArea } from '@radix-ui/react-scroll-area';

export default function VendorApprovalPanel() {
  const [vendorRequests, setVendorRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const { toast } = useToast();

  // States for editing vendor info and item list
  const [editVendorInfo, setEditVendorInfo] = useState({});
  const [editItemList, setEditItemList] = useState([]);

  const [showVendorForm, setShowVendorForm] = useState(false);
  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemIndex, setEditingItemIndex] = useState(null);

  useEffect(() => {
    fetchVendorRequests();
  }, []);

  const fetchVendorRequests = async () => {
    try {
      const response = await api.get(`/api/vendor/requests?status=verified`);
      setVendorRequests(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load vendor requests.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id, vendorInfo = editVendorInfo, itemList = editItemList) => {
    setLoading(true);

    const dataToUpdate = {
      ...vendorInfo,
      item_list: itemList,
    };

    const cleanedData = { ...dataToUpdate };
    delete cleanedData.confirm_password;

    try {
      await api.post(`/api/vendor-requests/${id}/approve/`, cleanedData);
      toast({
        title: 'Vendor Approved',
        description: 'Vendor and item list saved successfully.',
      });
      await fetchVendorRequests();
      setSelectedVendor(null);
      setEditVendorInfo({});
      setEditItemList([]);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Approval failed.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeny = async (id) => {
    setLoading(true);
    try {
      await api.post(`/api/vendor/deny/${id}/`);
      toast({
        title: 'Vendor Denied',
        description: 'Vendor request has been denied.',
      });
      await fetchVendorRequests();
      setSelectedVendor(null);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Denial failed.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (vendor) => {
    setSelectedVendor(vendor);
    setEditVendorInfo(vendor.vendor_data || {});
    setEditItemList(vendor.item_list || []);
  };

  const handleCloseModal = () => {
    setSelectedVendor(null);
    setEditVendorInfo({});
    setEditItemList([]);
  };

  return (
    <div className="min-w-0 space-y-4">
      {vendorRequests.length === 0 ? (
        <div className="rounded-[12px] border border-border bg-muted/40 p-6 text-center">
          <p className="text-sm font-medium text-card-foreground">No vendor requests awaiting approval.</p>
          <p className="mt-1 text-xs text-muted-foreground">New verified vendor applications will appear here.</p>
        </div>
      ) : (
        <div className="grid min-w-0 gap-2">
          {vendorRequests.map((vendor, index) => (
            <Card
              key={vendor.id ?? index}
              className="overflow-hidden rounded-[12px] border border-border bg-card shadow-sm"
            >
              <CardHeader className="border-b border-border p-2 sm:p-5">
                <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <CardTitle className="truncate text-base font-bold text-card-foreground sm:text-lg">
                      {vendor.vendor_data?.company_name || vendor.user?.email || "Vendor application"}
                    </CardTitle>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {vendor.user?.email || `User ID: ${vendor.user}`}
                    </p>
                  </div>
                  <span className="inline-flex w-fit shrink-0 items-center rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                    {vendor.status || "Pending"}
                  </span>
                </div>
              </CardHeader>

              <CardContent className="p-2 sm:p-5">
                <div className="grid gap-2 sm:grid-cols-2">
                  <div className="rounded-[12px] border border-border bg-muted/50 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Account</p>
                    <p className="mt-1 break-all text-sm font-medium text-card-foreground">
                      {vendor.user?.email || `User ID: ${vendor.user}`}
                    </p>
                  </div>
                  <div className="rounded-[12px] border border-border bg-muted/50 p-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Application</p>
                    <p className="mt-1 text-sm font-medium text-card-foreground">Vendor registration</p>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <Button
                    disabled={loading}
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setEditVendorInfo(vendor.vendor_data || {});
                      setEditItemList(vendor.item_list || []);
                      handleApprove(vendor.id, vendor.vendor_data || {}, vendor.item_list || []);
                    }}
                    className="w-full rounded-[20px] bg-blue-600 text-white hover:bg-blue-700"
                  >
                    Approve
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={loading}
                    onClick={() => handleDeny(vendor.id)}
                    className="w-full rounded-[20px]"
                  >
                    Deny
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => handleViewDetails(vendor)}
                    className="w-full rounded-[20px] border-border bg-card text-foreground hover:bg-muted"
                  >
                    View details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!selectedVendor} onClose={handleCloseModal} fullWidth maxWidth="md">
        <DialogTitle className="!border-b !border-border !bg-card !text-card-foreground">
          Vendor details
        </DialogTitle>
        <DialogContent dividers className="!border-border !bg-card">
          {selectedVendor && (
            <div className="space-y-5 py-2 text-card-foreground">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {selectedVendor.vendor_data &&
                  Object.entries(selectedVendor.vendor_data).map(([key, value]) => {
                    if (Array.isArray(value) || (typeof value === "object" && value !== null)) return null;
                    return (
                      <div key={key} className="rounded-[12px] border border-border bg-muted/40 p-2">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          {key.replace(/_/g, " ")}
                        </p>
                        <p className="mt-1 break-words text-sm text-card-foreground">{String(value)}</p>
                      </div>
                    );
                  })}
              </div>

              {Array.isArray(selectedVendor.item_list) && selectedVendor.item_list.length > 0 && (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-card-foreground">Items</h3>
                    <span className="text-xs text-muted-foreground">{selectedVendor.item_list.length} item(s)</span>
                  </div>
                  <div className="space-y-3">
                    {selectedVendor.item_list.map((item, idx) => (
                      <div key={`${item.name}-${idx}`} className="rounded-[12px] border border-border bg-muted/40 p-2">
                        <div className="flex flex-col gap-2 sm:flex-row">
                          {item.image && (
                            <img
                              src={resolveApiAssetUrl(item.image)}
                              alt={item.name || "Vendor item"}
                              className="h-24 w-24 shrink-0 rounded-[12px] border border-border object-cover"
                            />
                          )}
                          <div className="min-w-0 space-y-1 text-sm">
                            {Object.entries(item).map(([itemKey, itemValue]) =>
                              itemKey === "image" ? null : (
                                <p key={itemKey} className="break-words text-muted-foreground">
                                  <strong className="text-card-foreground">{itemKey.replace(/_/g, " ")}:</strong>{" "}
                                  {String(itemValue)}
                                </p>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>

        <DialogActions className="!border-t !border-border !bg-card !p-2">
          <div className="grid w-full gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Button variant="outline" onClick={() => { setEditVendorInfo(selectedVendor.vendor_data || {}); setShowVendorForm(true); }} className="w-full rounded-[20px] border-border">
              Edit vendor info
            </Button>
            <Button variant="outline" onClick={() => { setEditItemList(selectedVendor.item_list || []); setShowItemForm(true); }} className="w-full rounded-[20px] border-border">
              Edit item list
            </Button>
            <Button disabled={loading} onClick={() => handleApprove(selectedVendor.id)} className="w-full rounded-[20px] bg-blue-600 text-white hover:bg-blue-700">
              Approve
            </Button>
            <Button disabled={loading} variant="destructive" onClick={() => handleDeny(selectedVendor.user)} className="w-full rounded-[20px]">
              Deny
            </Button>
            <Button onClick={handleCloseModal} className="w-full rounded-[20px] border border-border bg-transparent text-foreground hover:bg-muted">
              Close
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      <Dialog open={showVendorForm} onClose={() => setShowVendorForm(false)} fullWidth maxWidth="md">
        <DialogTitle className="!border-b !border-border !bg-card !text-card-foreground">Edit vendor info</DialogTitle>
        <DialogContent dividers className="!border-border !bg-card">
          {editVendorInfo && (
            <div className="grid grid-cols-1 gap-2 py-2 md:grid-cols-2">
              {Object.entries(editVendorInfo).map(([key, value]) => {
                const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

                if (typeof value === "string" && (value === "yes" || value === "no")) {
                  return (
                    <label key={key} htmlFor={key} className="flex items-center gap-2 rounded-[12px] border border-border bg-muted/40 p-2 text-sm text-card-foreground">
                      <input id={key} type="checkbox" checked={value === "yes"} onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.checked ? "yes" : "no" })} />
                      <span>{label}</span>
                    </label>
                  );
                }

                if (key.toLowerCase().includes("description") || (typeof value === "string" && value.length > 50)) {
                  return (
                    <div key={key} className="md:col-span-2">
                      <label htmlFor={key} className="mb-1.5 block text-xs font-semibold text-card-foreground">{label}</label>
                      <textarea id={key} value={value || ""} onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })} placeholder={label} rows={4} className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20" />
                    </div>
                  );
                }

                if (key === "payment_method") {
                  return (
                    <div key={key} className="md:col-span-2">
                      <label htmlFor={key} className="mb-1.5 block text-xs font-semibold text-card-foreground">{label}</label>
                      <select id={key} value={value || ""} onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })} className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                        <option value="">Select {label}</option>
                        <option value="BANK_TRANSFER">Bank Transfer</option>
                        <option value="MOBILE_MONEY">Mobile Money</option>
                        <option value="CASH">Cash</option>
                      </select>
                    </div>
                  );
                }

                return (
                  <div key={key}>
                    <label htmlFor={key} className="mb-1.5 block text-xs font-semibold text-card-foreground">{label}</label>
                    <input id={key} type={key.toLowerCase().includes("email") ? "email" : "text"} value={value || ""} onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })} placeholder={label} className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
        <DialogActions className="!border-t !border-border !bg-card !p-2">
          <div className="flex w-full flex-col justify-end gap-2 sm:flex-row">
            <Button variant="outline" onClick={() => setShowVendorForm(false)} className="w-full rounded-[20px] border-border sm:w-auto">Cancel</Button>
            <Button disabled={loading} onClick={async () => {
              setLoading(true);
              try {
                const response = await api.put(
                  `/api/vendor-requests/${selectedVendor.id}/update-vendor-info/`,
                  { vendor_data: editVendorInfo },
                  { withCredentials: true }
                );
                const updatedVendor = { ...selectedVendor, vendor_data: response.data.vendor_data };
                setVendorRequests((prev) => prev.map((vendor) => (vendor.user === selectedVendor.user ? updatedVendor : vendor)));
                toast({ title: "Vendor info updated successfully." });
                setShowVendorForm(false);
              } catch (error) {
                toast({ title: "Error", description: "Something went wrong while updating vendor.", variant: "destructive" });
              } finally {
                setLoading(false);
              }
            }} className="w-full rounded-[20px] bg-blue-600 text-white hover:bg-blue-700 sm:w-auto">
              Save
            </Button>
          </div>
        </DialogActions>
      </Dialog>

      <Dialog open={showItemForm} onClose={() => setShowItemForm(false)} fullWidth maxWidth="md">
        <DialogTitle className="!border-b !border-border !bg-card !text-card-foreground">Edit item list</DialogTitle>
        <DialogContent dividers className="!border-border !bg-card !p-2 sm:!p-2">
          {Array.isArray(editItemList) && editItemList.length > 0 ? (
            <div className="space-y-4">
              {editItemList.map((item, index) => (
                <Card key={index} className="rounded-[12px] border border-border bg-card shadow-sm">
                  <CardContent className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1 text-sm text-card-foreground">
                      <p className="font-semibold">{item.name}</p>
                      <p className="text-muted-foreground">{item.description}</p>
                      <p><strong>Price:</strong> KES {item.price != null ? item.price.toLocaleString() : "N/A"}</p>
                      {item.image && <img src={resolveApiAssetUrl(item.image)} alt={item.name} className="mt-2 h-24 w-36 rounded-[12px] border border-border bg-muted/40 object-contain p-1" />}
                    </div>
                    <Button onClick={() => setEditingItemIndex(index)} className="w-full rounded-[20px] bg-blue-600 text-white hover:bg-blue-700 sm:w-auto">Edit</Button>
                  </CardContent>
                </Card>
              ))}
              {editingItemIndex !== null && (
                <div className="rounded-[12px] border border-border bg-card p-2">
                  <div className="mb-2 flex items-start justify-between gap-2 border-b border-border pb-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-primary">Marketplace</p>
                      <h2 className="text-base font-bold text-card-foreground">Edit item</h2>
                      <p className="text-xs text-muted-foreground">Update the item details, pricing, inventory, and image before approval.</p>
                    </div>
                    <Button onClick={() => setEditingItemIndex(null)} className="rounded-[12px] border border-border bg-transparent px-2 py-1 text-xs text-foreground hover:bg-muted">Close</Button>
                  </div>
                  <div className="max-h-[70vh] overflow-y-auto pr-1">
                    <ItemAddNew
                      vendorId={selectedVendor?.id}
                      vendor={selectedVendor}
                      initialItem={editItemList[editingItemIndex]}
                      onSave={(updatedItem) => {
                        const updatedList = [...editItemList];
                        updatedList[editingItemIndex] = updatedItem;
                        setEditItemList(updatedList);
                        setEditingItemIndex(null);
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">No items to edit.</p>
          )}
        </DialogContent>
        <DialogActions className="!border-t !border-border !bg-card !p-2">
          <Button variant="outline" onClick={() => setShowItemForm(false)} className="w-full rounded-[20px] border border-border bg-transparent text-foreground hover:bg-muted sm:w-auto">Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
