import React from "react";
import useBanners from "../../../../../../cmponents/Hooks/BannerHook/BannerHook";
import { resolveApiAssetUrl } from "../../../../../../Services/Api";

const BannerMedia = ({ banner, bannerImage }) => {
  const [imageLoaded, setImageLoaded] = React.useState(false);
  const [imageFailed, setImageFailed] = React.useState(false);

  return (
    <div className="relative m-2 aspect-[16/9] overflow-hidden rounded-xl bg-gray-200">
      {(!bannerImage || !imageLoaded || imageFailed) && (
        <div
          className="absolute inset-0 animate-pulse bg-gray-200"
          aria-label={imageFailed ? "Banner image unavailable" : "Loading banner image"}
        />
      )}
      {bannerImage && !imageFailed && (
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
      )}
    </div>
  );
};

const Banners = () => {
  const { banners, loading, error } = useBanners();

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

                  {bannerImage && (
                    <div className="px-4 pb-4 pt-2">
                      <h3 className="truncate text-sm font-semibold text-card-foreground">
                        {banner.title || "Marketplace highlight"}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-muted-foreground">
                        {banner.subtitle || banner.item?.name || banner.product_name || "Discover this marketplace highlight."}
                      </p>
                      {banner.call_to_action_url && (
                        <a
                          href={banner.call_to_action_url}
                          className="mt-3 inline-flex rounded-full border border-border bg-background px-3 py-1.5 text-[11px] font-semibold text-card-foreground transition-colors hover:bg-muted"
                        >
                          Shop now
                        </a>
                      )}
                    </div>
                  )}
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