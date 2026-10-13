import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CircularProgress, useTheme } from "@mui/material";
import { tokens } from "../../theme";
import api, { resolveApiAssetUrl } from "../../Services/Api";
import "./VendorDetailsPage.css";

const VendorDetailsPage = () => {
  const { vendorId } = useParams();
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");

    api.get(`/api/vendors/${vendorId}/`, { withCredentials: true })
      .then(({ data }) => {
        if (active) setVendor(data || null);
      })
      .catch((requestError) => {
        if (active) {
          setError(
            requestError?.response?.data?.detail ||
            requestError?.response?.data?.error ||
            "Unable to load vendor details."
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [vendorId]);

  if (loading) {
    return (
      <div className="mm-vendor-detail-page" style={{ color: colors.gray[100] }}>
        <CircularProgress size={28} aria-label="Loading vendor details" />
      </div>
    );
  }

  if (error || !vendor) {
    return (
      <main className="mm-vendor-detail-page">
        <Link className="mm-vendor-detail-back" to="/admin-dashboard/vendors">← Back to vendors</Link>
        <div className="mm-vendor-detail-error">{error || "Vendor not found."}</div>
      </main>
    );
  }

  const avatar = resolveApiAssetUrl(
    vendor.profile_picture_url || vendor.profile || vendor.company_logo_url || vendor.brand_logo_url
  );
  const fullName = [vendor.first_name, vendor.surname_name || vendor.last_name].filter(Boolean).join(" ");
  const fields = [
    ["Vendor code", vendor.vendor_code],
    ["Email", vendor.email],
    ["Phone", vendor.phone_number || vendor.phone],
    ["Company", vendor.company_name],
    ["Username", vendor.username],
    ["Country", vendor.country],
    ["City", vendor.city],
    ["Address", vendor.address || vendor.workshop_location],
    ["Joined", vendor.date_created ? new Date(vendor.date_created).toLocaleDateString() : ""],
    ["Status", vendor.status || (vendor.is_active === false ? "Inactive" : "Active")],
    ["Items", Array.isArray(vendor.items) ? vendor.items.length : vendor.item_count],
  ];

  return (
    <main className="mm-vendor-detail-page">
      <Link className="mm-vendor-detail-back" to="/admin-dashboard/vendors">← Back to vendors</Link>
      <header className="mm-vendor-detail-header" style={{ backgroundColor: colors.primary[600], color: colors.gray[100] }}>
        {avatar ? (
          <img className="mm-vendor-detail-avatar" src={avatar} alt="" />
        ) : (
          <div className="mm-vendor-detail-avatar" aria-hidden="true" />
        )}
        <div>
          <h1 className="mm-vendor-detail-heading">{vendor.company_name || fullName || vendor.username || "Vendor details"}</h1>
          <p className="mm-vendor-detail-subtitle" style={{ color: colors.gray[300] }}>{fullName && vendor.company_name ? fullName : vendor.email || "Vendor account"}</p>
          <span className="mm-vendor-detail-state" style={{ backgroundColor: colors.primary[700], color: colors.gray[100] }}>{vendor.status || (vendor.is_active === false ? "Inactive" : "Active")}</span>
        </div>
      </header>
      <section className="mm-vendor-detail-grid" aria-label="Vendor information">
        {fields.map(([label, rawValue]) => (
          <article className="mm-vendor-detail-card" key={label} style={{ backgroundColor: colors.primary[700], color: colors.gray[100] }}>
            <p className="mm-vendor-detail-label" style={{ color: colors.gray[300] }}>{label}</p>
            <p className="mm-vendor-detail-value">{rawValue === null || rawValue === undefined || rawValue === "" ? "—" : String(rawValue)}</p>
          </article>
        ))}
      </section>
    </main>
  );
};

export default VendorDetailsPage;
