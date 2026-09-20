import { useEffect, useRef, useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  shieldCheckmarkOutline,
  cubeOutline,
  newspaperOutline,
  pricetagOutline,
  imageOutline,
} from "ionicons/icons";
import VendorApprovalPanel from "../VENDORPAGE/VendorRegistration/HandleApproveDeny";
import VendorItemCreateRequests from "../VENDORPAGE/Products/VendorItems/AdminApproveDenyItemCreate";
import AdminPriceApproval from "./ApproveItemPrice";
import AdminBlogApprovalPage from "./ApproveBlogs/ApproveBlogs";
import AdminBannerApprovalPage from "./ApproveBanner/ApproveBanner";
import { getWebSocketUrl } from "../../Services/Api";

const sections = [
  { key: "vendors", label: "Vendor Requests", icon: shieldCheckmarkOutline },
  { key: "items", label: "Item Requests", icon: cubeOutline },
  { key: "blogs", label: "Blog Requests", icon: newspaperOutline },
  { key: "prices", label: "Price Updates", icon: pricetagOutline },
  { key: "banners", label: "Banner Requests", icon: imageOutline },
];

const sectionTitles = {
  vendors: {
    title: "Vendor requests awaiting approval",
    description: "Review verified vendor applications before they become active marketplace vendors.",
  },
  items: {
    title: "Vendor items awaiting approval",
    description: "Review item creation requests submitted by marketplace vendors.",
  },
  blogs: {
    title: "Blogs awaiting approval",
    description: "Review vendor blog submissions before publication.",
  },
  prices: {
    title: "Vendor price updates awaiting approval",
    description: "Review requested item price changes before they are applied.",
  },
  banners: {
    title: "Banner requests awaiting approval",
    description: "Review vendor promotional banners before they become visible.",
  },
};

const UiForVendorRequest = () => {
  const [activeSection, setActiveSection] = useState("vendors");
  const [refreshToken, setRefreshToken] = useState(0);
  const wsRef = useRef(null);
  const reconnectTimerRef = useRef(null);
  const reconnectAttemptRef = useRef(0);
  const manuallyClosedRef = useRef(false);

  useEffect(() => {
    manuallyClosedRef.current = false;

    const connect = () => {
      if (manuallyClosedRef.current) return;

      const socket = new WebSocket(getWebSocketUrl("/ws/admin/vendor-requests/"));
      wsRef.current = socket;

      socket.onopen = () => {
        reconnectAttemptRef.current = 0;
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message?.type === "vendor_request.changed") {
            setRefreshToken((value) => value + 1);
          }
        } catch (error) {
          console.error("Invalid vendor request WebSocket message:", error);
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

      socket.onerror = () => socket.close();
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
  }, []);

  const active = sectionTitles[activeSection];

  return (
    <section className="min-w-0 space-y-5 p-2 sm:p-4">
      <header className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <IonIcon icon={shieldCheckmarkOutline} className="text-xl" />
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold text-card-foreground sm:text-2xl">
              Vendor Requests
            </h1>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
              Manage vendor, item, content, pricing and banner approvals.
            </p>
          </div>
        </div>
      </header>

      <nav className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {sections.map((section) => {
          const selected = activeSection === section.key;
          return (
            <button
              key={section.key}
              type="button"
              onClick={() => setActiveSection(section.key)}
              className={[
                "flex min-w-0 items-center justify-center gap-2 rounded-xl border px-3 py-3 text-xs font-semibold transition sm:text-sm",
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-card-foreground",
              ].join(" ")}
            >
              <IonIcon icon={section.icon} className="shrink-0 text-base" />
              <span className="truncate">{section.label}</span>
            </button>
          );
        })}
      </nav>

      <article className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="border-b border-border p-4 sm:p-5">
          <h2 className="text-base font-bold text-card-foreground sm:text-lg">
            {active.title}
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground sm:text-sm">
            {active.description}
          </p>
        </div>

        <div className="min-w-0 p-2 sm:p-4">
          {activeSection === "vendors" && (
            <VendorApprovalPanel key={`vendors-${refreshToken}`} />
          )}
          {activeSection === "items" && (
            <VendorItemCreateRequests key={`items-${refreshToken}`} />
          )}
          {activeSection === "blogs" && (
            <AdminBlogApprovalPage key={`blogs-${refreshToken}`} />
          )}
          {activeSection === "prices" && (
            <AdminPriceApproval key={`prices-${refreshToken}`} />
          )}
          {activeSection === "banners" && (
            <AdminBannerApprovalPage key={`banners-${refreshToken}`} />
          )}
        </div>
      </article>
    </section>
  );
};

export default UiForVendorRequest;
