import useBanners from "../../../../../../cmponents/Hooks/BannerHook/BannerHook";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../../theme";

const Banners = () => {
  const { banners, loading, error } = useBanners();

  const theme = useTheme();
  const colors = tokens(theme.palette.mode)

  if (loading || error || !Array.isArray(banners) || banners.length === 0) {
    return null;
  }
  

  return (
    <div className="banners">
      <div className="max-w-7xl mx-auto">
        <div className="wrapper">
        <div className="mb-6 text-start sectop mt-5">
          <h2 className="title">Banners</h2>
        </div>
          <div className="column">
            <div className="banner flexwrap">
              {banners.slice(0, 4).map((banner) => {
                const bannerImage = banner.image?.startsWith("http")
                  ? banner.image
                  : banner.image
                  ? `${baseUrl || ""}${banner.image}`
                  : null;

                return (
                  <div className="row" key={banner.id}>
                    <div
                      className="item get-gray"
                      style={{
                        backgroundColor: !bannerImage
                          ? banner.background_color || "#f0f0f0"
                          : "transparent",
                      }}
                    >
                      {bannerImage && (
                        <div className="image object-cover">
                          <img
                            src={bannerImage}
                            alt={
                              banner.product_name ||
                              banner.title ||
                              "Banner"
                            }
                          />
                        </div>
                      )}

                      <div className="text-content fexcol">
                        <h3 className="text-gray-600 p-1 rounded-[5px] " style={{backgroundColor:'rgba(255, 255, 255, 0.6)'}}>{banner.title}</h3>
                        <h4>
                          <span className="p-1" style={{backgroundColor:'rgba(255, 255, 255, 0.6)'}}>{banner.subtitle}</span>
                          <br />
                          {banner.item.name}
                        </h4>

                        {banner.call_to_action_url && (
                          <a
                            href={banner.call_to_action_url}
                            className="secondary-button mt-2"
                          >
                            Shop Now
                          </a>
                        )}
                      </div>

                      {banner.call_to_action_url && (
                        <a
                          href={banner.call_to_action_url}
                          className="over-link"
                        ></a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Banners;
