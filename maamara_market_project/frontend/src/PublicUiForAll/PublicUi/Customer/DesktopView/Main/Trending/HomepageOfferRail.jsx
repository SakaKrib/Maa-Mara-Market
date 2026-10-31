import React from "react";
import { Link } from "react-router-dom";
import TrendingProductCard from "./TrendingProductCard";
import useHomepageOffers from "./useHomepageOffers";
import OfferTimeLeft from "./OfferTimeLeft";

const MAX_ITEMS = 5;

const DESCRIPTIONS = {
  ending_soon: "Last chance: these offers end within 48 hours",
  weekly: "Offers running for a week or less",
  monthly: "Offers running for up to a month",
  long: "Longer-running offers",
};

// One duration group of running offers (up to five items and a "View all"
// link). Place it between existing homepage sections; it renders nothing when
// no offer of this duration is running.
const HomepageOfferRail = ({ groupKey }) => {
  const groups = useHomepageOffers(MAX_ITEMS);
  const group = groups.find((entry) => entry.key === groupKey);
  if (!group || !group.items?.length) return null;

  const items = group.items.slice(0, MAX_ITEMS);

  return (
    <section className="mm-section" aria-label={group.label}>
      <div className="mm-container">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              ON OFFER
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">{group.label}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {DESCRIPTIONS[groupKey]}
              <OfferTimeLeft endDate={items[0]?.offer?.end_date} prefix=" · Next ends in " className="font-semibold" />
            </p>
          </div>

          <div className="mm-mobile-product-rail mm-mobile-horizontal-scroll md:grid md:grid-cols-3 md:gap-4 lg:grid-cols-5">
            {items.map((item) => (
              <div key={item.id} className="mm-mobile-product-rail-item md:w-auto">
                <TrendingProductCard item={item} />
              </div>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              to={`/offers?group=${groupKey}`}
              className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
            >
              View all{group.total > items.length ? ` (${group.total})` : ""}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageOfferRail;
