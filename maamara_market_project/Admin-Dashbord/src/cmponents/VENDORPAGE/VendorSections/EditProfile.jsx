"use client";

import { useTheme } from "@mui/material";
import { tokens } from "../../../theme";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../../components/ui/sheet";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { useState } from "react";

export default function VendorProfileSheet({ vendor = {}, onSave }) {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  console.log(vendor)

  const [formData, setFormData] = useState({
    first_name: vendor.first_name || "",
    middle_name: vendor.middle_name || "",
    surname_name: vendor.surname_name || "",
    email: vendor.email || "",
    phone_number: vendor.phone_number || "",
    id_number: vendor.id_number || "",
    vendor_code: vendor.vendor_code || "",
    address: vendor.address || "",
    address_2: vendor.address_2 || "",
    city: vendor.city || "",
    country: vendor.country || "",
    company_name: vendor.company_name || "",
    company_logo_existing: vendor.vendor_company_logo || null,
    company_logo_new: null,
    workshop_location: vendor.workshop_location || "",
    product_type: vendor.product_type || "",
    is_food: vendor.is_food || "",
    Are_You_KEBS_certified: vendor.Are_You_KEBS_certified || "",
    product_description: vendor.product_description || "",
    payment_method: vendor.payment_method || "",
    bank_account_number: vendor.bank_account_number || "",
    mpesa_type: vendor.mpesa_type || "",
    mpesa_number: vendor.mpesa_number || "",
    mpesa_till: vendor.mpesa_till || "",
    mpesa_paybill: vendor.mpesa_paybill || "",
    paypal_email: vendor.paypal_email || "",
    tax_number: vendor.tax_number || "",
    website_url: vendor.website_url || "",
    profile_picture_existing: vendor.profile_picture || null,
    profile_picture_new: null,
    brand_name: vendor.brand?.name || "",
    brand_description: vendor.brand?.description || "",
    brand_logo_existing: vendor.brand?.logo?.url || null, // <-- fixed
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    const payload = { ...formData };

    // Nest brand data
    payload.brand = {
      name: formData.brand_name,
      description: formData.brand_description,
      logo: formData.brand_logo_new || null,
    };
    delete payload.brand_name;
    delete payload.brand_description;
    delete payload.brand_logo_new;
    delete payload.brand_logo_existing;

    // Only send new files if user uploaded them
    if (formData.profile_picture_new) payload.profile_picture = formData.profile_picture_new;
    if (formData.company_logo_new) payload.company_logo = formData.company_logo_new;

    onSave(payload);
  };

  const imageFields = [
    { keyExisting: "company_logo_existing", keyNew: "company_logo_new", label: "Company Logo" },
    { keyExisting: "profile_picture_existing", keyNew: "profile_picture_new", label: "Profile Picture" },
    { keyExisting: "brand_logo_existing", keyNew: "brand_logo_new", label: "Brand Logo" },
  ];

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline">Edit Profile</Button>
      </SheetTrigger>

      <SheetContent
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{ backgroundColor: colors.primary[500] }}
      >
        <SheetHeader>
          <SheetTitle>Complete Your Vendor Profile</SheetTitle>
          <SheetDescription>
            Please fill in the missing details to activate your profile.
          </SheetDescription>
        </SheetHeader>

        <div className="flex flex-col gap-4 mt-6">
          {/* Text fields */}
          {Object.entries(formData).map(([key, value]) => {
            if (key.endsWith("_existing") || key.endsWith("_new")) return null; // handled separately
            if (["company_logo_new", "profile_picture_new", "brand_logo_new"].includes(key)) return null;

            return (
              <div key={key} className="flex flex-col gap-1">
                <label className="font-semibold capitalize">
                  {key.replace(/_/g, " ")}
                </label>
                <Input
                  type="text"
                  value={value}
                  placeholder={`Enter ${key.replace(/_/g, " ")}`}
                  onChange={(e) => handleChange(key, e.target.value)}
                />
              </div>
            );
          })}

          <label className="font-semibold capitalize">Brand Logo</label>

          {/* File input */}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                brand_logo_new: e.target.files[0] || null,
              }))
            }
          />

          {/* Image fields */}
          {imageFields.map(({ keyExisting, keyNew, label }) => (
            <div key={keyNew} className="flex flex-col gap-1">
              <label className="font-semibold capitalize">{label}</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => handleChange(keyNew, e.target.files[0] || null)}
              />
              {formData[keyExisting] && (
                <img
                  src={formData[keyExisting]}
                  alt={label}
                  className="w-24 h-24 object-cover rounded mt-2 rounded-full"
                />
              )}
            </div>
          ))}

          <Button onClick={handleSubmit} className="mt-4">
            Save Profile
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
