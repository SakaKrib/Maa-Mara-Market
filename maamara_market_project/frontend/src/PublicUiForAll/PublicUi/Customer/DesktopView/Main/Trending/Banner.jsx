import React from "react";
import { useNavigate } from "react-router-dom";
import useBanners from "../../../../../../cmponents/Hooks/BannerHook/BannerHook";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

// Curated palette only (mirrors the vendor banner form and the API check), so a
// colour from the server can never inject arbitrary CSS.
const BANNER_COLORS = new Set([
  "#f5f4f1", "#eef3f8", "#edf4ea", "#f6efe7",
  "#f8eaea", "#f3eef7", "#eaf4f4", "#efefec",
]);

const safeBannerColor = (value) => {
  const color = String(value || "").trim().toLowerCase();
  return BANNER_COLORS.has(color) ? color : "";
};

const bannerLink = (banner) => {
  if (banner.cta_type === "external" && /^https?:\/\//i.test(banner.cta_url || "")) {
    return { href: banner.cta_url, external: true };
  }
  const itemId = banner.cta_item?.id ?? banner.cta_item ?? banner.item?.id ?? banner.item;
  if (itemId) return { href: `/item/${itemId}`, external: false };
  return null;
};

const BannerMedia = ({ banner, bannerImage }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);
  const color = safeBannerColor(banner.background_color);

  // No image: show the vendor's themed colour panel with the banner text.
  if (!bannerImage || imageFailed) {
    return (
      <div
        className="relative m-2 flex aspect-[16/9] flex-col items-center justify-center gap-1 overflow-hidden rounded-xl border border-border bg-muted px-5 text-center"
        style={color ? { backgroundColor: color } : undefined}
      >
        <p className="line-clamp-2 text-base font-bold" style={{ color: "#1f2937" }}>
          {banner.title || "Marketplace highlight"}
        </p>
        {banner.subtitle && (
          <p className="line-clamp-2 text-xs" style={{ color: "#4b5563" }}>
            {banner.subtitle}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="relative m-2 aspect-[16/9] overflow-hidden rounded-xl bg-gray-200">
      {!imageLoaded && (
        <div
          className="absolute inset-0 animate-pulse"
          style={{ backgroundColor: color || "#e5e7eb" }}
          aria-label="Loading banner image"
        />
      )}
      <img
          src={bannerImage}
          alt={banner.title || "Marketplace banner"}
          loading="lazy"
          className={`relative z-[1] h-full w-full object-cover transition-opacity duration-200 ${imageLoaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageLoaded(false);
            setImageFailed(true);
          }}
        />
    </div>
  );
};

const Banners = () => {
  const { banners, loading, error } = useBanners();
  const navigate = useNavigate();

  if (loading || error || !Array.isArray(banners) || banners.length === 0) {
    return null;
  }

  return (
    <section className="mm-section">
      <div className="mm-container">
        <div className="rounded-2xl border border-border bg-card p-4 shadow-custom sm:p-5">
          <div className="mb-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">
              MARKETPLACE HIGHLIGHTS
            </p>
            <h2 className="mt-1 text-lg font-bold text-card-foreground sm:text-xl">
              Featured banners
            </h2>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              Discover current offers and marketplace highlights.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mm-mobile-horizontal-scroll mm-mobile-banner-rail">
            {banners.slice(0, 3).map((banner) => {
              const bannerImage = resolveApiAssetUrl(banner.image);

              return (
                <article
                  key={banner.id}
                  className="overflow-hidden rounded-2xl border border-border bg-background mm-mobile-banner-card"
                >
                  <BannerMedia banner={banner} bannerImage={bannerImage} />

                  <div className="px-4 pb-4 pt-2">
                    <h3 className="truncate text-sm font-semibold text-card-foreground">
                      {banner.title || "Marketplace highlight"}
                    </h3>
                    <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                      {banner.subtitle || banner.item?.name || banner.product_name || "Discover this marketplace highlight."}
                    </p>
                    {(() => {
                      const link = bannerLink(banner);
                      if (!link) return null;
                      const cls =
                        "mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-card-foreground transition-colors hover:bg-muted";
                      return link.external ? (
                        <a href={link.href} target="_blank" rel="noopener noreferrer" className={cls}>
                          Shop now
                        </a>
                      ) : (
                        <button type="button" onClick={() => navigate(link.href)} className={cls}>
                          Shop now
                        </button>
                      );
                    })()}
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Banners;