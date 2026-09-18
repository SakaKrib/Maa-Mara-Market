import useBanners from "../../../../../../cmponents/Hooks/BannerHook/BannerHook";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const Banners = () => {
  const { banners, loading, error } = useBanners();

  if (loading || error || !Array.isArray(banners) || banners.length === 0) {
    return null;
  }

  return (
    <section className="banners mm-section">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div>
            <h2 className="title">Banners</h2>
          </div>
        </div>
        <div className="banner flexwrap">
          {banners.slice(0, 4).map((banner) => {
            const bannerImage = banner.image?.startsWith("http")
              ? banner.image
              : banner.image
                ? `${baseUrl || ""}${banner.image}`
                : null;
            const productName = banner.item?.name || banner.product_name;

            return (
              <div className="row" key={banner.id}>
                <div
                  className="item get-gray"
                  style={{ backgroundColor: !bannerImage ? banner.background_color || "#f0f0f0" : "transparent" }}
                >
                  {bannerImage && (
                    <div className="image object-cover">
                      <img src={bannerImage} alt={productName || banner.title || "Banner"} loading="lazy" />
                    </div>
                  )}
                  <div className="text-content fexcol">
                    {banner.title && (
                      <h3 className="text-gray-600 p-1 rounded-[5px]" style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}>
                        {banner.title}
                      </h3>
                    )}
                    {(banner.subtitle || productName) && (
                      <h4>
                        {banner.subtitle && <span className="p-1" style={{ backgroundColor: "rgba(255, 255, 255, 0.6)" }}>{banner.subtitle}</span>}
                        {productName && <><br />{productName}</>}
                      </h4>
                    )}
                    {banner.call_to_action_url && (
                      <a href={banner.call_to_action_url} className="secondary-button mt-2">Shop Now</a>
                    )}
                  </div>
                  {banner.call_to_action_url && <a href={banner.call_to_action_url} className="over-link" aria-label="Shop now" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default Banners;