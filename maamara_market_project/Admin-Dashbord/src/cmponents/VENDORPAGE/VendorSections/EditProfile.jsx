"use client";

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
import { useMemo, useState } from "react";

export default function VendorProfileSheet({ vendor = {}, onSave }) {
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
    is_food: vendor.is_food ?? false,
    Are_You_KEBS_certified: vendor.Are_You_KEBS_certified ?? false,
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
    brand_logo_existing: vendor.brand?.logo?.url || vendor.brand?.logo || null,
    brand_logo_new: null,
  });

  const [saving, setSaving] = useState(false);

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async () => {
    if (!onSave || saving) return;

    const payload = {
      ...formData,
      brand: {
        name: formData.brand_name,
        description: formData.brand_description,
        logo: formData.brand_logo_new || null,
      },
    };

    try {
      setSaving(true);
      await onSave(payload);
    } finally {
      setSaving(false);
    }
  };

  const imageFields = [
    {
      keyExisting: "company_logo_existing",
      keyNew: "company_logo_new",
      label: "Company Logo",
    },
    {
      keyExisting: "profile_picture_existing",
      keyNew: "profile_picture_new",
      label: "Profile Picture",
    },
    {
      keyExisting: "brand_logo_existing",
      keyNew: "brand_logo_new",
      label: "Brand Logo",
    },
  ];

  const textFields = useMemo(
    () => [
      ["first_name", "First name"],
      ["middle_name", "Middle name"],
      ["surname_name", "Surname"],
      ["email", "Email"],
      ["phone_number", "Phone number"],
      ["id_number", "National ID"],
      ["vendor_code", "Vendor code"],
      ["address", "Address"],
      ["address_2", "Address 2"],
      ["city", "City"],
      ["country", "Country"],
      ["company_name", "Company name"],
      ["workshop_location", "Workshop location"],
      ["product_type", "Product type"],
      ["product_description", "Product description"],
      ["payment_method", "Payment method"],
      ["bank_account_number", "Bank account number"],
      ["mpesa_type", "M-Pesa type"],
      ["mpesa_number", "M-Pesa number"],
      ["mpesa_till", "M-Pesa till"],
      ["mpesa_paybill", "M-Pesa paybill"],
      ["paypal_email", "PayPal email"],
      ["tax_number", "Tax number"],
      ["website_url", "Website URL"],
      ["brand_name", "Brand name"],
      ["brand_description", "Brand description"],
    ],
    []
  );

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="rounded-lg bg-[#2563eb] px-4 py-2 font-semibold text-white hover:bg-[#1d4ed8]">
          Edit Profile
        </Button>
      </SheetTrigger>

      <SheetContent className="w-full overflow-y-auto border-l border-gray-200 bg-white p-0 sm:max-w-xl">
        <div className="border-b border-gray-200 px-6 py-5">
          <SheetHeader>
            <SheetTitle className="text-xl font-bold text-gray-900">
              Edit Vendor Profile
            </SheetTitle>
            <SheetDescription className="text-sm text-gray-500">
              Update your business, contact, payout, brand, and profile details.
            </SheetDescription>
          </SheetHeader>
        </div>

        <div className="space-y-7 px-6 py-6">
          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
              Profile details
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              {textFields.map(([key, label]) => (
                <div
                  key={key}
                  className={
                    key === "product_description" || key === "brand_description"
                      ? "sm:col-span-2"
                      : ""
                  }
                >
                  <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                    {label}
                  </label>
                  <Input
                    type="text"
                    value={formData[key] ?? ""}
                    onChange={(event) => handleChange(key, event.target.value)}
                    className="border-gray-300 bg-white text-gray-900"
                  />
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-bold uppercase tracking-wide text-gray-700">
              Vendor status
            </h3>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(formData.is_food)}
                  onChange={(event) => handleChange("is_food", event.target.checked)}
                  className="h-4 w-4 accent-[#2563eb]"
                />
                Food item vendor
              </label>
              <label className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3 text-sm font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={Boolean(formData.Are_You_KEBS_certified)}
                  onChange={(event) =>
                    handleChange("Are_You_KEBS_certified", event.target.checked)
                  }
                  className="h-4 w-4 accent-[#2563eb]"
                />
                KEBS certified
              </label>
            </div>
          </section>

          <section>
            <h3 className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-700">
              Images
            </h3>
            <div className="space-y-5">
              {imageFields.map(({ keyExisting, keyNew, label }) => (
                <div
                  key={keyNew}
                  className="rounded-xl border border-gray-200 bg-white p-4"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                    {formData[keyExisting] ? (
                      <img
                        src={formData[keyExisting]}
                        alt={label}
                        className="h-20 w-20 rounded-lg border border-gray-200 object-cover"
                      />
                    ) : (
                      <div className="grid h-20 w-20 place-items-center rounded-lg border border-dashed border-gray-300 bg-gray-50 text-xs text-gray-400">
                        No image
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <label className="mb-1.5 block text-sm font-semibold text-gray-700">
                        {label}
                      </label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(event) =>
                          handleChange(keyNew, event.target.files?.[0] || null)
                        }
                        className="border-gray-300 bg-white text-gray-900"
                      />
                      {formData[keyNew] && (
                        <p className="mt-2 truncate text-xs text-gray-500">
                          Selected: {formData[keyNew].name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="sticky bottom-0 -mx-6 flex justify-end border-t border-gray-200 bg-white px-6 py-4">
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={saving}
              className="rounded-lg bg-[#2563eb] px-5 py-2 font-semibold text-white hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
