import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Store, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "../../../../components/ui/button";
import api from "../../../Services/Api";
import AddingNewItem from "../../VENDORPAGE/Products/Forms/AddingNewItem";

const getVendorName = (vendor) =>
  [vendor?.first_name, vendor?.surname_name]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  vendor?.company_name ||
  vendor?.username ||
  `Vendor #${vendor?.id ?? ""}`;

const normalizeProductType = (vendor) =>
  String(vendor?.product_type ?? "").trim().toLowerCase();

export default function AdminCreateNewVendorItemPage() {
  const navigate = useNavigate();
  const [vendors, setVendors] = useState([]);
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    const loadVendors = async () => {
      try {
        setError("");
        const response = await api.get("/api/vendors/", {
          withCredentials: true,
        });
        const data = Array.isArray(response.data)
          ? response.data
          : response.data?.results || [];

        if (active) setVendors(data);
      } catch (requestError) {
        console.error("Unable to load vendors:", requestError);
        if (active) {
          setError(
            requestError.response?.data?.detail ||
              "Unable to load the registered vendors."
          );
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    loadVendors();

    return () => {
      active = false;
    };
  }, []);

  const selectedVendor = useMemo(
    () =>
      vendors.find(
        (vendor) => String(vendor.id) === String(selectedVendorId)
      ) || null,
    [vendors, selectedVendorId]
  );

  const productTypeLabel = selectedVendor
    ? normalizeProductType(selectedVendor) === "both"
      ? "Organic + Handmade"
      : normalizeProductType(selectedVendor) === "organic"
        ? "Organic"
        : "Handmade / Inorganic"
    : "";

  return (
    <section className="min-w-0 space-y-5 p-2 text-card-foreground sm:p-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Store className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">
                Admin · New Item
              </p>
              <h1 className="mt-1 text-xl font-bold text-card-foreground sm:text-2xl">
                Create Item for Vendor
              </h1>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Select the vendor first. Their product type will determine the
                available item section.
              </p>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="w-full rounded-xl border-border bg-transparent text-foreground hover:bg-muted sm:w-auto"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
      </header>

      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="mb-3">
          <label
            htmlFor="admin-vendor-select"
            className="text-sm font-semibold text-card-foreground"
          >
            Vendor
          </label>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            This vendor will own the new item. You can only continue after a
            vendor is selected.
          </p>
        </div>

        {loading ? (
          <div className="rounded-xl border border-border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
            Loading vendors…
          </div>
        ) : (
          <select
            id="admin-vendor-select"
            value={selectedVendorId}
            onChange={(event) => setSelectedVendorId(event.target.value)}
            className="w-full rounded-xl border border-border bg-card px-3 py-3 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="">Select a vendor…</option>
            {vendors.map((vendor) => (
              <option key={vendor.id} value={vendor.id}>
                {getVendorName(vendor)}
                {vendor.company_name ? ` — ${vendor.company_name}` : ""}
              </option>
            ))}
          </select>
        )}

        {error && (
          <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}

        {selectedVendor && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Selected vendor
              </p>
              <p className="mt-1 truncate text-sm font-bold text-card-foreground">
                {getVendorName(selectedVendor)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-primary">
              <CheckCircle2 className="h-4 w-4" />
              {productTypeLabel}
            </div>
          </div>
        )}
      </div>

      {!selectedVendor ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center sm:p-12">
          <Store className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold text-card-foreground">
            Select a vendor to begin
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-muted-foreground">
            Once a vendor is selected, the complete item form will appear and
            every admin-editable field will remain unlocked.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-4">
          <AddingNewItem
            initialItem={null}
            vendorId={selectedVendor.id}
            vendor={selectedVendor}
            isAdmin
            adminCreateNew
            onSave={() => {
              setSaving(false);
              navigate(-1);
            }}
          />
        </div>
      )}

      {saving && (
        <div className="fixed bottom-4 right-4 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold shadow-lg">
          Saving item…
        </div>
      )}
    </section>
  );
}
