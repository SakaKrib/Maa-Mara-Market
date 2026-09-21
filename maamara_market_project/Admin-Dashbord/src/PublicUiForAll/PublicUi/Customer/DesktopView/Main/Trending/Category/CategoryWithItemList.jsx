import React, { useEffect, useState } from "react";
import api from "../../../../../../../Services/Api";
import { baseUrl } from "../../../../../../../cmponents/Constant/Constant";

const CategoryWithItems = ({ onSelectItem }) => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    api
      .get("/api/categories-with-items/")
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data?.results) ? res.data.results : [];
        setCategories(data);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setError("No Categories found.");
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <p className="text-center text-sm text-muted-foreground">Loading categories…</p>
      </section>
    );
  }

  if (error || !categories.length) {
    return (
      <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
        <p className="text-center text-sm text-muted-foreground">{error || "No categories found."}</p>
      </section>
    );
  }

  const visibleCategories = categories
    .map((category) => {
      const allItems =
        category.subcategories
          ?.flatMap((subcat) => subcat.items || [])
          .filter(Boolean) || [];

      return { ...category, firstItem: allItems[0] };
    })
    .filter((category) => category.firstItem)
    .slice(0, 6);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
      <div className="mb-4 flex items-end justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
            SHOP BY CATEGORY
          </p>
          <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">
            Explore our categories
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            Browse a selection of products from across Maa Mara Market.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {visibleCategories.map((category) => {
          const firstItem = category.firstItem;
          const imageUrl = firstItem.image
            ? firstItem.image.startsWith?.("http")
              ? firstItem.image
              : `${baseUrl}${firstItem.image}`
            : "/placeholder.jpg";

          const description =
            category.description ||
            `Explore products in ${category.name}.`;

          return (
            <article
              key={category.id}
              className="min-w-0 rounded-2xl border border-border bg-background p-2.5 transition-shadow hover:shadow-custom"
            >
              <div className="overflow-hidden rounded-xl bg-muted">
                <img
                  src={imageUrl}
                  alt={category.name}
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              </div>

              <div className="px-1 pb-1 pt-3">
                <h3 className="truncate text-sm font-semibold text-card-foreground">
                  {category.name}
                </h3>
                <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                  {description}
                </p>
                <a
                  href={`/subcategory/${category.id}/products`}
                  className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-card-foreground transition-colors hover:bg-muted"
                  onClick={() => onSelectItem?.(firstItem.id)}
                >
                  Explore
                </a>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};

export default CategoryWithItems;