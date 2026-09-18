import React from "react";
import "../../../../PublicUi/maamara.css";
import "../../../../../index.css";
import HomepageHero from "./HomepageHero";
import ListPage from "./ListPage";
import TrendingProducts from "./Trending/Product";
import BrandList from "./Trending/Brands";
import Banners from "./Trending/Banner";
import CategoryWithItems from "./Trending/Category/CategoryWithItemList";
import AdvertBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/BlogAdvert";
import OrganicSlideshow from "./Trending/OrganicAdvert/OrganicDvert";

const Main = () => (
  <main className="mm-page">
    <HomepageHero />

    <section className="category-collections mm-section">
      <div className="category-cont">
        <div className="containers">
          <div className="wrappe">
            <CategoryWithItems />
          </div>
        </div>
      </div>
    </section>

    <BrandList />
    <ListPage />
    <OrganicSlideshow />
    <TrendingProducts />
    <Banners />
    <AdvertBlogs />
  </main>
);

export default Main;
