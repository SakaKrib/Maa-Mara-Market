import React from "react";
import "../../../../PublicUi/maamara.css";
import CategoryWithItems from "./Trending/Category/CategoryWithItemList";
import MarketplaceDiscovery from "./Discovery/MarketplaceDiscovery";
import AccountHighlights from "./AccountHighlights";
import Banners from "./Trending/Banner";
import AdvertBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/BlogAdvert";
import MobileHomepageFlow from "./MobileHomepageFlow";

const Main = () => (
  <main className="mm-page">
    <AccountHighlights />

    <MobileHomepageFlow />

    <section className="category-collections mm-section hidden md:block">
      <div className="mm-container">
        <CategoryWithItems />
      </div>
    </section>

    <div className="hidden md:block">
      <Banners />
      <AdvertBlogs />
    </div>
    <MarketplaceDiscovery />
  </main>
);

export default Main;
