import React, { useEffect, useState } from "react";
import api from "../../../../../../Services/Api";
import CategoryWithItems from "./Trending/Category/CategoryWithItemList";
import Banners from "./Trending/Banner";
import AdvertBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/BlogAdvert";

const MobileHomepageCollections = () => {
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api
      .get("/api/homepage-collections/?items=10&sections=8")
      .then((response) => {
        if (!active) return;
        setCollections(Array.isArray(response.data) ? response.data : []);
      })
      .catch(() => {
        if (!active) return;
        setCollections([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <section className="mm-section">
        <div className="mm-container">
          <div className="mm-card p-6 text-center text-sm text-muted-foreground">
            Loading marketplace collections…
          </div>
        </div>
      </section>
    );
  }

  if (!collections.length) return null;

  return (
    <div className="mm-mobile-home-collections">
      {collections.map((collection) => (
        <section key={collection.id} className="mm-section">
          <div className="mm-container">
            <div className="mm-section-heading">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  {collection.department || collection.section || "MARKETPLACE"}
                </p>
                <h2>{collection.name}</h2>
                <p>Explore products from this category.</p>
              </div>

              <a
                href={`/filter-category?category=${collection.id}`}
                className="shrink-0 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-semibold text-card-foreground"
              >
                View more
              </a>
            </div>

            <div className="mm-mobile-product-rail mm-mobile-horizontal-scroll">
              {collection.items.map((item) => (
                <div key={item.id} className="mm-mobile-product-rail-item">
                  <TrendingProductCard item={item} />
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
    </div>
  );
};

const TrendingProductCard = React.lazy(() => import("./Trending/TrendingProductCard"));

const MobileHomepageFlow = () => (
  <div className="md:hidden">
    <CategoryWithItems />
    <MobileHomepageCollections />
    <Banners />
    <AdvertBlogs />
  </div>
);

export default MobileHomepageFlow;
