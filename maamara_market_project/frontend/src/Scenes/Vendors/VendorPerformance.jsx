import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import { arrowBackOutline, starSharp, storefrontOutline, cashOutline, documentTextOutline } from "ionicons/icons";
import api from "../../Services/Api";

const StatCard = ({ label, value, icon }) => (
  <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
    <div className="flex items-center justify-between gap-3">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      <IonIcon icon={icon} className="text-xl text-primary" />
    </div>
    <p className="mt-3 text-2xl font-bold text-card-foreground">{value}</p>
  </div>
);

const VendorPerformance = () => {
  const { vendorId } = useParams();
  const [data, setData] = useState(null);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");
      const [performanceResponse, vendorResponse] = await Promise.all([
        api.get("/api/vendors/" + vendorId + "/performance/", { withCredentials: true }),
        api.get("/api/vendors/" + vendorId + "/", { withCredentials: true }),
      ]);
      setData(performanceResponse.data);
      setVendor(vendorResponse.data);
    } catch (requestError) {
      console.error("Failed to load vendor performance:", requestError);
      setError(requestError.response?.data?.detail || "Unable to load vendor performance.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [vendorId]);

  if (loading) {
    return <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">Loading vendor performance…</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <Link to="/admin-dashboard/vendors" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
          <IonIcon icon={arrowBackOutline} /> Back to vendors
        </Link>
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">{error}</div>
      </div>
    );
  }

  const sales = data?.sales || {};
  const ratings = data?.shop_ratings || {};
  const reviews = data?.item_reviews || {};
  const items = data?.items || {};

  return (
    <section className="min-w-0 space-y-6 p-2 sm:p-4">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link to="/admin-dashboard/vendors" className="inline-flex items-center gap-2 text-xs font-semibold text-primary">
            <IonIcon icon={arrowBackOutline} /> Back to vendors
          </Link>
          <h1 className="mt-3 text-2xl font-bold text-card-foreground">{vendor?.company_name || data?.vendor?.name || "Vendor"} Performance</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sales, shop ratings, item reviews, stars, and catalogue activity.</p>
        </div>
        <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${vendor?.is_active === false ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}>
          {vendor?.is_active === false ? "Suspended" : "Active"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Sales" value={"KES " + Number(sales.amount || 0).toLocaleString()} icon={cashOutline} />
        <StatCard label="Units sold" value={Number(sales.units || 0).toLocaleString()} icon={storefrontOutline} />
        <StatCard label="Orders" value={Number(sales.orders || 0).toLocaleString()} icon={documentTextOutline} />
        <StatCard label="Shop rating" value={Number(ratings.average || 0).toFixed(1) + " / 5"} icon={starSharp} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Rating submissions" value={Number(ratings.count || 0).toLocaleString()} icon={starSharp} />
        <StatCard label="Item reviews" value={Number(reviews.count || 0).toLocaleString()} icon={documentTextOutline} />
        <StatCard label="Review stars" value={Number(reviews.average_stars || 0).toFixed(1) + " / 5"} icon={starSharp} />
        <StatCard label="Active items" value={Number(items.active || 0).toLocaleString()} icon={storefrontOutline} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold text-card-foreground">Shop ratings</h2>
          <p className="mt-1 text-sm text-muted-foreground">Customer rating dimensions recorded for this vendor.</p>
          <div className="mt-5 space-y-4">
            {[
              ["Overall", ratings.average],
              ["Quality", ratings.quality],
              ["Communication", ratings.communication],
              ["Shipping", ratings.shipping],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="mb-1 flex justify-between text-sm">
                  <span className="font-medium text-card-foreground">{label}</span>
                  <span className="font-semibold text-card-foreground">{Number(value || 0).toFixed(1)} / 5</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(100, Number(value || 0) * 20)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold text-card-foreground">Catalogue</h2>
          <p className="mt-1 text-sm text-muted-foreground">Current items attached to this vendor.</p>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Total items</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">{Number(items.count || 0).toLocaleString()}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="text-xs text-muted-foreground">Active items</p>
              <p className="mt-1 text-xl font-bold text-card-foreground">{Number(items.active || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VendorPerformance;
