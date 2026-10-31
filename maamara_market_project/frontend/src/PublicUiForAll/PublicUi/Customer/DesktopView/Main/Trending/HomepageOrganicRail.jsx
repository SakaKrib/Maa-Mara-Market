import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";
import TrendingProductCard from "./TrendingProductCard";

const MAX_ITEMS = 5;

// Organic produce (Item.is_organic). Renders nothing until at least one organic
// item is in stock, so the homepage never shows an empty container.
const HomepageOrganicRail = () => {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    api
      .get("/filter-products/", { params: { organic: "true", perPage: MAX_ITEMS } })
      .then((response) => {
        if (!active) return;
        const data = response.data || {};
        const rows = Array.isArray(data) ? data : data.results || [];
        setItems(rows.slice(0, MAX_ITEMS));
        setTotal(Number(data.count) || rows.length);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!items.length) return null;

  return (
    <section className="mm-section" aria-label="Organic produce">
      <div className="mm-container">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              FRESH &amp; NATURAL
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">Organic produce</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Organic products from our marketplace sellers.
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
              to="/filter-category?organic=true"
              className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
            >
              View all{total > items.length ? ` (${total})` : ""}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageOrganicRail;
