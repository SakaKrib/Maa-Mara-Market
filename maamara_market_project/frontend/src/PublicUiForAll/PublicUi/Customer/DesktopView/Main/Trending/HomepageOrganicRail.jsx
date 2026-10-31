import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api, { resolveApiAssetUrl } from "../../../../../../Services/Api";

const MAX_CATEGORIES = 6;

// The Organic section, shown as a single "Organic" department with its
// categories (and subcategories) listed under it. Organic items are kept out of
// the other homepage sections, so the two never mix. Renders nothing until the
// Organic section has at least one in-stock item.
const HomepageOrganicRail = () => {
  const [data, setData] = useState(null);

  useEffect(() => {
    let active = true;
    api
      .get("/api/homepage-organic/")
      .then((response) => {
        if (active) setData(response.data || null);
      })
      .catch(() => {
        if (active) setData(null);
      });
    return () => {
      active = false;
    };
  }, []);

  const categories = Array.isArray(data?.categories) ? data.categories : [];
  if (!categories.length) return null;

  const visible = categories.slice(0, MAX_CATEGORIES);

  return (
    <section className="mm-section" aria-label="Organic department">
      <div className="mm-container">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              ORGANIC DEPARTMENT
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">{data.department || "Organic"}</h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Browse every organic category from our marketplace sellers.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6 mm-mobile-horizontal-scroll mm-mobile-category-rail">
            {visible.map((category) => (
              <article
                key={category.id}
                className="min-w-0 rounded-2xl border border-border bg-background p-2.5 transition-shadow hover:shadow-custom mm-mobile-category-card"
              >
                {category.image ? (
                  <div className="overflow-hidden rounded-xl bg-muted">
                    <img
                      src={resolveApiAssetUrl(category.image)}
                      alt={category.name}
                      loading="lazy"
                      className="aspect-square w-full object-cover"
                    />
                  </div>
                ) : null}
                <div className="px-1 pb-1 pt-3">
                  <h3 className="truncate text-sm font-semibold text-card-foreground">{category.name}</h3>
                  <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                    {category.subcategories?.length
                      ? category.subcategories.slice(0, 3).join(" · ")
                      : `${category.item_count} item${category.item_count === 1 ? "" : "s"}`}
                  </p>
                  <Link
                    to={`/filter-category?section=organic&category=${category.id}`}
                    className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-card-foreground transition-colors hover:bg-muted"
                  >
                    Explore
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-4 flex justify-center">
            <Link
              to="/filter-category?section=organic"
              className="inline-flex rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold text-card-foreground transition-colors hover:bg-muted"
            >
              View all{data.total_items ? ` (${data.total_items})` : ""}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HomepageOrganicRail;
