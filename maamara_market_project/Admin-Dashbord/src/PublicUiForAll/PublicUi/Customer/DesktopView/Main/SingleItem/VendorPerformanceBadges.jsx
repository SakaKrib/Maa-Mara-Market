import React, { useEffect, useRef, useState } from "react";
import api from "../../../../../../Services/Api";

const BADGE_META = {
  quality: {
    label: "Quality",
    title: "Quality recognition",
    description: "Shoppers have consistently rated this shop's product quality highly.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path d="M12 3l7 3v5c0 4.5-2.9 8.2-7 10-4.1-1.8-7-5.5-7-10V6l7-3z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="m8.8 12 2.1 2.1 4.4-4.5" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" />
      </svg>
    ),
  },
  communication: {
    label: "Communication",
    title: "Communication recognition",
    description: "Shoppers have consistently rated this shop highly for clear and helpful communication.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path d="M5 5.5h14a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2h-7l-4.5 3v-3H5a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2z" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <path d="M7.5 10h9M7.5 13h6" stroke="currentColor" strokeLinecap="round" strokeWidth="1.6" />
      </svg>
    ),
  },
  shipping: {
    label: "Shipping",
    title: "Shipping recognition",
    description: "Shoppers have consistently rated this shop highly for reliable and timely shipping.",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
        <path d="M3 6.5h11v9H3zM14 10h4l3 3v2.5h-7z" fill="none" stroke="currentColor" strokeLinejoin="round" strokeWidth="1.8" />
        <circle cx="7" cy="17.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="18" cy="17.5" r="1.7" fill="none" stroke="currentColor" strokeWidth="1.8" />
      </svg>
    ),
  },
};

const VendorPerformanceBadges = ({ itemId }) => {
  const [badges, setBadges] = useState(null);
  const [openBadge, setOpenBadge] = useState(null);
  const rootRef = useRef(null);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const response = await api.get(`/api/items/${itemId}/marketplace-context/`, {
          withCredentials: true,
        });
        if (active) setBadges(response.data?.shop_summary?.badges || {});
      } catch (error) {
        console.error("Vendor performance badges load failed:", error);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [itemId]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpenBadge(null);
      }
    };
    document.addEventListener("pointerdown", handleOutside);
    return () => document.removeEventListener("pointerdown", handleOutside);
  }, []);

  if (!badges) return null;

  const earnedBadges = Object.entries(BADGE_META).filter(
    ([key]) => badges[key]?.eligible
  );

  if (!earnedBadges.length) return null;

  return (
    <div ref={rootRef} aria-label="Vendor performance recognitions">
      <p className="mb-2 text-[10px] leading-4 text-muted-foreground">
        Press and hold a badge to see its details.
      </p>
      <div className="flex flex-wrap items-center gap-2">
      {earnedBadges.map(([key, meta]) => {
        const count = Number(badges[key]?.count || 0);
        const isOpen = openBadge === key;

        return (
          <div key={key} className="relative">
            <button
              type="button"
              onClick={() => setOpenBadge(isOpen ? null : key)}
              onMouseEnter={() => setOpenBadge(key)}
              onMouseLeave={() => setOpenBadge(null)}
              className="flex items-center gap-1.5 rounded-full border border-gray-300 bg-background px-2.5 py-1.5 text-[11px] font-medium text-card-foreground transition-colors hover:bg-muted focus:outline-none focus:ring-2 focus:ring-border"
              aria-expanded={isOpen}
              aria-label={meta.title}
            >
              {meta.icon}
              <span>{meta.label}</span>
            </button>

            {isOpen && (
              <div
                role="tooltip"
                className="absolute left-0 top-full z-30 mt-2 w-64 rounded-xl border border-border bg-card p-3 text-left shadow-custom"
              >
                <p className="text-xs font-semibold text-card-foreground">{meta.title}</p>
                <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
                  {meta.description}
                </p>
                <p className="mt-2 text-[10px] font-medium text-muted-foreground">
                  {count} shoppers rated this category 4 stars or higher.
                </p>
              </div>
            )}
          </div>
        );
      })}
      </div>
    </div>
  );
};

export default VendorPerformanceBadges;
