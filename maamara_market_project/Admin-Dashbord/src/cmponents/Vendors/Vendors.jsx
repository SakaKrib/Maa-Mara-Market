import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
  eyeOutline,
  refreshOutline,
  storefrontOutline,
  cubeOutline,
  locationOutline,
  callOutline,
  mailOutline,
} from "ionicons/icons";
import { useAuth } from "../Auth/AuthContext/Context";
import EditItem from "../VENDORPAGE/Products/Forms/EditItem/EditItem";
import api, {
  getWebSocketUrl,
  resolveApiAssetUrl,
} from "../../Services/Api";

const defaultAvatar = "/default-avatar.png";
const defaultProduct = "/default-product.jpg";

const formatCurrency = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) ? amount.toLocaleString() : "0";
};

const getVendorName = (vendor) =>
  [vendor.first_name, vendor.surname_name]
    .filter(Boolean)
    .join(" ")
    .trim() ||
  vendor.company_name ||
  "Unnamed vendor";

const getItemPrice = (item) => {
  const price = Number(item.price);
  const discount = Number(item.discount_price);

  if (
    Number.isFinite(discount) &&
    discount > 0 &&
    Number.isFinite(price) &&
    discount < price
  ) {
    return { current: discount, original: price };
  }

  return {
    current: Number.isFinite(price) ? price : 0,
    original: null,
  };
};

const truncate = (value, maxWords = 12) => {
  if (!value) return "No description available";
  const words = String(value).trim().split(/\s+/);
  return words.length > maxWords
    ? `${words.slice(0, maxWords).join(" ")}…`
    : value;
};

const VendorItemCard = ({ vendor, item }) => {
  const { current, original } = getItemPrice(item);
  const image = resolveApiAssetUrl(item.image) || defaultProduct;

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-custom">
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={image}
          alt={item.name || "Vendor item"}
          className="h-full w-full object-cover"
          onError={(event) => {
            event.currentTarget.onerror = null;
            event.currentTarget.src = defaultProduct;
          }}
        />
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="truncate text-sm font-semibold text-card-foreground">
            {item.name || "Unnamed item"}
          </h3>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {truncate(item.description)}
          </p>
        </div>

        <div className="flex items-baseline gap-2">
          <span className="text-sm font-bold text-primary">
            KES {formatCurrency(current)}
          </span>
          {original !== null && (
            <span className="text-xs text-muted-foreground line-through">
              KES {formatCurrency(original)}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span>Size: {item.size || "—"}</span>
          <span>Stock: {item.in_stock ?? 0}</span>
          <EditItem vendor={vendor} item={item} />
        </div>
      </div>
    </article>
  );
};

const Vendor_list = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const manuallyClosedRef = useRef(false);

  const fetchVendors = useCallback(async () => {
    if (!isAuthenticated) return;

    try {
      setError("");
      const response = await api.get("/api/vendors/", {
        withCredentials: true,
      });

      const vendorArray = Array.isArray(response.data)
        ? response.data
        : response.data?.results || [];

      setVendors(vendorArray);
      setLastUpdated(new Date());
    } catch (requestError) {
      console.error("Error fetching vendors:", requestError);
      setError(
        requestError.response?.data?.detail ||
          "Unable to load the registered vendors."
      );
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;
    fetchVendors();
  }, [authLoading, isAuthenticated, fetchVendors]);

  useEffect(() => {
    if (authLoading || !isAuthenticated) return;

    manuallyClosedRef.current = false;

    const connect = () => {
      if (manuallyClosedRef.current) return;

      const socket = new WebSocket(getWebSocketUrl("/ws/admin/vendors/"));
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "vendor.changed") {
            fetchVendors();
          }
        } catch (socketError) {
          console.error("Invalid vendor WebSocket message:", socketError);
        }
      };

      socket.onclose = (event) => {
        wsRef.current = null;

        if (manuallyClosedRef.current || event.code === 4403) return;

        const delay = Math.min(
          1000 * 2 ** reconnectAttemptRef.current,
          15000
        );
        reconnectAttemptRef.current += 1;

        reconnectTimerRef.current = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();

    return () => {
      manuallyClosedRef.current = true;
      if (reconnectTimerRef.current) {
        window.clearTimeout(reconnectTimerRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
      wsRef.current = null;
    };
  }, [authLoading, isAuthenticated, fetchVendors]);

  if (authLoading || loading) {
    return (
      <div className="space-y-5 p-2 sm:p-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage registered marketplace vendors.
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">
          Loading vendors…
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="rounded-2xl border border-destructive/30 bg-card p-8 text-center">
        <p className="text-sm text-destructive">
          Access denied. Please sign in again.
        </p>
      </div>
    );
  }

  return (
    <section className="min-w-0 space-y-5 p-2 sm:p-4">
      <header className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
              <IonIcon icon={storefrontOutline} className="text-xl" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold text-card-foreground sm:text-2xl">
                Vendors
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Registered marketplace vendors and their products.
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchVendors}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-card-foreground transition hover:bg-muted sm:w-auto"
        >
          <IonIcon icon={refreshOutline} />
          Refresh
        </button>
      </header>

      {error && (
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Registered vendors
          </p>
          <p className="mt-1 text-2xl font-bold text-card-foreground">
            {vendors.length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Active vendors
          </p>
          <p className="mt-1 text-2xl font-bold text-card-foreground">
            {vendors.filter((vendor) => vendor.is_active !== false).length.toLocaleString()}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Last synchronized
          </p>
          <p className="mt-1 truncate text-sm font-semibold text-card-foreground">
            {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>

      {vendors.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center">
          <IonIcon icon={storefrontOutline} className="text-3xl text-muted-foreground" />
          <h2 className="mt-3 text-base font-semibold text-card-foreground">
            No registered vendors
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Approved vendors will appear here automatically.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {vendors.map((vendor) => {
            const vendorName = getVendorName(vendor);
            const avatar = resolveApiAssetUrl(vendor.profile_picture_url) || defaultAvatar;

            return (
              <article
                key={vendor.id}
                className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm"
              >
                <div className="flex flex-col gap-4 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src={avatar}
                      alt={vendorName}
                      className="h-12 w-12 shrink-0 rounded-full border border-border object-cover"
                      onError={(event) => {
                        event.currentTarget.onerror = null;
                        event.currentTarget.src = defaultAvatar;
                      }}
                    />
                    <div className="min-w-0">
                      <h2 className="truncate text-base font-bold text-card-foreground">
                        {vendorName}
                      </h2>
                      <p className="truncate text-xs text-muted-foreground">
                        {vendor.company_name || "No company name"}
                      </p>
                    </div>
                  </div>

                  <Link
                    to={`/admin-dashboard/vendors/${vendor.id}`}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 sm:w-auto"
                  >
                    <IonIcon icon={eyeOutline} />
                    View vendor
                  </Link>
                </div>

                <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-4 sm:p-5">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <IonIcon icon={mailOutline} /> Email
                    </p>
                    <p className="mt-1 truncate text-sm text-card-foreground">
                      {vendor.email || "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <IonIcon icon={callOutline} /> Phone
                    </p>
                    <p className="mt-1 truncate text-sm text-card-foreground">
                      {vendor.phone_number || "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <IonIcon icon={locationOutline} /> Workshop
                    </p>
                    <p className="mt-1 truncate text-sm text-card-foreground">
                      {vendor.workshop_location || "—"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      <IonIcon icon={cubeOutline} /> Products
                    </p>
                    <p className="mt-1 text-sm font-semibold text-card-foreground">
                      {(vendor.items || []).length.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="p-4 sm:p-5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-bold text-card-foreground">
                      Items by {vendorName}
                    </h3>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">
                      {(vendor.items || []).length} items
                    </span>
                  </div>

                  {(vendor.items || []).length === 0 ? (
                    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                      This vendor has no items yet.
                    </div>
                  ) : (
                    <div className="grid min-w-0 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
                      {vendor.items.map((item) => (
                        <VendorItemCard
                          key={`${vendor.id}-${item.id}`}
                          vendor={vendor}
                          item={item}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default Vendor_list;
