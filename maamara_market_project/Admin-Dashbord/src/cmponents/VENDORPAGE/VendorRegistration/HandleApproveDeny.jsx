import React, { useEffect, useState } from 'react';
import api from '../../../Services/Api';
import { baseUrl } from '../../Constant/Constant';
import { Button } from '../../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../../components/ui/card';
import { useToast } from '../../../../components/ui/toast';
import { useTheme, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { tokens } from '../../../theme';
import ItemAddNew from '../Products/Forms/AddingNewItem';
import { ScrollArea } from '@radix-ui/react-scroll-area';

export default function VendorApprovalPanel() {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
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
      const response = await api.get(`${baseUrl}/api/vendor/requests?status=verified`);
      setVendorRequests(response.data);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load vendor requests.',
        variant: 'destructive',
      });
    }
  };

  const handleApprove = async (id) => {
    setLoading(true);

    const dataToUpdate = {
      ...editVendorInfo,
      item_list: editItemList,
    };

    const cleanedData = { ...dataToUpdate };
    delete cleanedData.confirm_password;

    try {
      await api.post(`${baseUrl}/api/vendor-requests/${id}/approve/`, cleanedData);
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
      await api.post(`${baseUrl}/api/vendor/deny/${id}/`);
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
    <div className="space-y-4 p-4" style={{ height: 'fit-content' }}>
      <div style={{ backgroundColor: colors.primary[800], height: 'fit-content' }}>
        {vendorRequests.length === 0 ? (
          <p className="text-gray-600">No approved vendor requests found.</p>
        ) : (
          vendorRequests.map((vendor, index) => (
            <Card key={vendor.id ?? index} style={{ backgroundColor: colors.gray[800], border: 'none' }}>
              <CardHeader>
                <CardTitle style={{ color: colors.gray[100] }}>
                  {vendor.vendor_data?.company_name || vendor.user?.email}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="text-sm" style={{ color: colors.gray[100] }}>
                    {vendor.user?.email || `User ID: ${vendor.user}`}
                  </p>
                  <p style={{ color: colors.greenAccent[500] }}>
                    Status: <strong>{vendor.status}</strong>
                  </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    disabled={loading}
                    onClick={() => {
                      setSelectedVendor(vendor);
                      setEditVendorInfo(vendor.vendor_data || {});
                      setEditItemList(vendor.item_list || []);
                      handleApprove(vendor.id);
                    }}
                    variant="outline"
                  >
                    Approve
                  </Button>
                  <Button variant="destructive" disabled={loading} onClick={() => handleDeny(vendor.user)}>
                    Deny
                  </Button>
                  <Button variant="outline" onClick={() => handleViewDetails(vendor)}>
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Vendor Details Modal */}
      <Dialog open={!!selectedVendor} onClose={handleCloseModal} fullWidth maxWidth="md">
        <DialogTitle style={{ color: colors.blueAccent[100], backgroundColor: colors.primary[500] }}>
          Vendor Details
        </DialogTitle>
        <DialogContent dividers className="space-y-4">
          {selectedVendor && (
            <div style={{ backgroundColor: colors.gray[800], color: colors.primary[100], padding: '1em' }}>
              <div className="grid grid-cols-2 gap-4">
                {selectedVendor.vendor_data &&
                  Object.entries(selectedVendor.vendor_data).map(([key, value]) => {
                    if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                      return null;
                    }
                    return (
                      <p key={key}>
                        <strong>{key.replace(/_/g, ' ')}:</strong> {String(value)}
                      </p>
                    );
                  })}
              </div>

              {Array.isArray(selectedVendor.item_list) && selectedVendor.item_list.length > 0 && (
                <div className="mt-6">
                  <strong>Items:</strong>
                  <ul className="divide-y divide-gray-200 mt-2">
                    {selectedVendor.item_list.map((item, idx) => (
                      <li key={`${item.name}-${idx}`} className="py-2">
                        {Object.entries(item).map(([itemKey, itemValue]) => {
                          if (itemKey === 'image' && itemValue) {
                            const src = itemValue.startsWith('http')
                              ? itemValue
                              : `${baseUrl.replace(/\/$/, '')}/media/${itemValue.replace(/^\/+/, '')}`;
                            return (
                              <div key={itemKey} className="w-32 h-32 mt-2">
                                <img src={src} alt={item.name} className="w-32 h-32 object-cover" />
                              </div>
                            );
                          }
                          if (itemKey !== 'image') {
                            return (
                              <p key={itemKey}>
                                <strong>{itemKey.replace(/_/g, ' ')}:</strong> {String(itemValue)}
                              </p>
                            );
                          }
                          return null;
                        })}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <div className="flex justify-between w-full">
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditVendorInfo(selectedVendor.vendor_data || {});
                  setShowVendorForm(true);
                }}
                style={{ color: colors.primary[500] }}
              >
                Edit Vendor Info
              </Button>

              <Button
                variant="outline"
                onClick={() => {
                  setEditItemList(selectedVendor.item_list || []);
                  setShowItemForm(true);
                }}
                style={{ color: colors.primary[500] }}
              >
                Edit Item List
              </Button>
            </div>

            <div className="flex gap-4">
              <Button disabled={loading} variant="success" onClick={() => handleApprove(selectedVendor.id)}>
                Approve
              </Button>

              <Button disabled={loading} variant="destructive" onClick={() => handleDeny(selectedVendor.user)}>
                Deny
              </Button>

              <Button onClick={handleCloseModal}>Close</Button>
            </div>
          </div>
        </DialogActions>
      </Dialog>

      {/* Edit Vendor Info Modal */}
      <Dialog open={showVendorForm} onClose={() => setShowVendorForm(false)} fullWidth maxWidth="md">
        <DialogTitle style={{ color: colors.blueAccent[100], backgroundColor: colors.primary[500] }}>
          Edit Vendor Info
        </DialogTitle>

        <DialogContent style={{ backgroundColor: colors.gray[800], color: colors.primary[100] }}>
          {editVendorInfo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              {Object.entries(editVendorInfo).map(([key, value]) => {
                const label = key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

                if (typeof value === 'string' && (value === 'yes' || value === 'no')) {
                  return (
                    <div key={key} className="flex items-center space-x-2">
                      <label htmlFor={key} className="text-white">
                        {label}:
                      </label>
                      <input
                        id={key}
                        type="checkbox"
                        checked={value === 'yes'}
                        onChange={(e) =>
                          setEditVendorInfo({ ...editVendorInfo, [key]: e.target.checked ? 'yes' : 'no' })
                        }
                      />
                    </div>
                  );
                }

                if (key.toLowerCase().includes('description') || (typeof value === 'string' && value.length > 50)) {
                  return (
                    <div key={key} className="col-span-1 md:col-span-2">
                      <label htmlFor={key} className="block text-white mb-1">
                        {label}
                      </label>
                      <textarea
                        id={key}
                        value={value || ''}
                        onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })}
                        placeholder={label}
                        rows={4}
                        className="p-2 bg-gray-700 rounded w-full"
                      />
                    </div>
                  );
                }

                if (key === 'payment_method') {
                  return (
                    <div key={key} className="col-span-1 md:col-span-2">
                      <label htmlFor={key} className="block text-white mb-1">
                        {label}
                      </label>
                      <select
                        id={key}
                        value={value || ''}
                        onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })}
                        className="p-2 bg-gray-700 rounded text-white w-full"
                      >
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
                    <label htmlFor={key} className="block text-white mb-1">
                      {label}
                    </label>
                    <input
                      id={key}
                      type={key.toLowerCase().includes('email') ? 'email' : 'text'}
                      value={value || ''}
                      onChange={(e) => setEditVendorInfo({ ...editVendorInfo, [key]: e.target.value })}
                      placeholder={label}
                      className="p-2 bg-gray-700 rounded w-full"
                    />
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>

        <DialogActions>
          <Button variant="outline" onClick={() => setShowVendorForm(false)}>
            Cancel
          </Button>
          <Button
            disabled={loading}
            variant="success"
            onClick={async () => {
              setLoading(true);
              try {
                const response = await api.put(
                  `${baseUrl}/api/vendor-requests/${selectedVendor.id}/update-vendor-info/`,
                  { vendor_data: editVendorInfo },
                  { withCredentials: true }
                );

                const updatedVendor = {
                  ...selectedVendor,
                  vendor_data: response.data.vendor_data,
                };

                setVendorRequests((prev) =>
                  prev.map((vendor) => (vendor.user === selectedVendor.user ? updatedVendor : vendor))
                );

                toast({ title: 'Vendor info updated successfully.' });
                setShowVendorForm(false);
              } catch (error) {
                toast({
                  title: 'Error',
                  description: 'Something went wrong while updating vendor.',
                  variant: 'destructive',
                });
              } finally {
                setLoading(false);
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit Item List Modal */}
      <Dialog open={showItemForm} onClose={() => setShowItemForm(false)} fullWidth maxWidth="md">
        <DialogTitle style={{ color: colors.blueAccent[100], backgroundColor: colors.primary[500] }}>
          Edit Item List
        </DialogTitle>
        <DialogContent style={{ background: colors.gray[800], color: colors.primary[100] }}>
          {Array.isArray(editItemList) && editItemList.length > 0 ? (
            <div className="space-y-4">
              {editItemList.map((item, index) => (
                <Card key={index} style={{ background: colors.primary[700] }}>
                  <CardContent className="flex justify-between items-center">
                    <div className="mt-5" style={{ color: colors.gray[100] }}>
                      <p>
                        <strong>{item.name}</strong>
                      </p>
                      <p>{item.description}</p>
                      <p className="semi-bold">Price: KES {item.price != null ? item.price.toLocaleString() : 'N/A'}</p>
                      {item.image && (
                        <img
                          src={item.image}
                          alt={item.name}
                          style={{ maxWidth: '150px', maxHeight: '100px', objectFit: 'contain' }}
                        />
                      )}
                    </div>
                    <Button sx={{ '&:hover': { backgroundColor: colors.gray[100] } }} onClick={() => setEditingItemIndex(index)}>
                      Edit
                    </Button>
                  </CardContent>
                </Card>
              ))}

              {/* Edit single item modal */}
              <Dialog
                open={editingItemIndex !== null}
                onClose={() => setEditingItemIndex(null)}
                fullWidth
                maxWidth="md"
                sx={{ scrollbarWidth: '15px' }}
              >
                <DialogTitle style={{ color: colors.blueAccent[100], background: colors.primary[500] }}>
                  Edit Item
                </DialogTitle>
                <DialogContent style={{ background: colors.gray[800], scrollbarWidth: '10px' }}>
                  <ScrollArea className="h-screen">
                    {editingItemIndex !== null && (
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
                    )}
                  </ScrollArea>
                </DialogContent>
              </Dialog>
            </div>
          ) : (
            <p>No items to edit.</p>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setShowItemForm(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
