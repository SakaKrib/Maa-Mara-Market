import React from "react";
import { Link } from "react-router-dom";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, Navigation } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/navigation";
import useBanners from "../../../../../cmponents/Hooks/BannerHook/BannerHook";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

const resolveMediaUrl = (value) => {
  if (!value) return null;
  return value.startsWith("http") ? value : `${baseUrl || ""}${value}`;
};

const HomepageHero = () => {
  const { banners, loading, error } = useBanners();

  if (loading) {
    return <section className="header-middle homepage-hero-loading" aria-label="Loading featured offers" />;
  }

  if (error || !banners.length) return null;

  return (
    <section className="header-middle" aria-label="Featured offers">
      <div className="container-full">
        <div className="wrapper">
          <Swiper
            modules={[Autoplay, Pagination, Navigation]}
            autoplay={{ delay: 5500, disableOnInteraction: false }}
            pagination={{ clickable: true }}
            navigation
            loop={banners.length > 1}
            className="myslider"
          >
            {banners.map((banner) => {
              const imageUrl = resolveMediaUrl(banner.image);
              const itemId = banner.cta_item || banner.item?.id || banner.item;
              const target = banner.cta_type === "item" && itemId
                ? `/item/${itemId}`
                : banner.cta_url;

              const slide = (
                <div className="item">
                  {imageUrl && (
                    <div className="image object-cover">
                      <img src={imageUrl} alt={banner.title || "Maa Mara Market featured offer"} />
                    </div>
                  )}
                  <div className="container relative top-10">
                    {banner.title && (
                      <h2>
                        <span className="text-5xl text-gray-100 relative top-10">{banner.title}</span>
                        {banner.subtitle && (
                          <>
                            <br />
                            <span className="text-3xl md:text-5xl top-10 relative text-gray-900">{banner.subtitle}</span>
                          </>
                        )}
                      </h2>
                    )}
                    {target && (
                      <span className="ring-3 primary-button p-4 hover:bg-black rounded-full hover:text-gray-100 font-semibold relative top-10 inline-block">
                        Shop Now
                      </span>
                    )}
                  </div>
                </div>
              );

              return (
                <SwiperSlide key={banner.id}>
                  {target ? (
                    target.startsWith("/") ? <Link to={target}>{slide}</Link> : <a href={target}>{slide}</a>
                  ) : slide}
                </SwiperSlide>
              );
            })}
          </Swiper>
        </div>
      </div>
    </section>
  );
};

export default HomepageHero;
