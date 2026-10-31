import React from "react";
import "../../../../PublicUi/maamara.css";
import CategoryWithItems from "./Trending/Category/CategoryWithItemList";
import MarketplaceDiscovery from "./Discovery/MarketplaceDiscovery";
import AccountHighlights from "./AccountHighlights";
import Banners from "./Trending/Banner";
import AdvertBlogs from "../../../../../cmponents/Hooks/BlogHooksNew/BlogAdvert";
import MobileHomepageFlow from "./MobileHomepageFlow";
import HomepageBrands from "./Trending/HomepageBrands";
import HomepageOfferRail from "./Trending/HomepageOfferRail";

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
      <HomepageOfferRail groupKey="weekly" />
      <Banners />
      <HomepageOfferRail groupKey="ending_soon" />
      <AdvertBlogs />
      <HomepageOfferRail groupKey="monthly" />
    </div>
    <MarketplaceDiscovery />
    <HomepageOfferRail groupKey="long" />
    <HomepageBrands />
  </main>
);

export default Main;
