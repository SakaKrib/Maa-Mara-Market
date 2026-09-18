import { Outlet } from "react-router-dom";
import Header from "../PublicUiForAll/PublicUi/Customer/DesktopView/Header/Header";
import Footer from "./PublicUi/Navigations/Footer/Footer";
import MobileMenu from "./PublicUi/Navigations/Footer/MobileFooter";
import ChatGpt from "./PublicUi/Navigations/Search/NavIcons/OpenAi/OpenAiGPT";

const CustomerShop = () => {
  return (
    <>
      <Header />
      <main className="relative h-max">
        <Outlet />
      </main>
      <MobileMenu/>
      <Footer />
      <div>
        <ChatGpt/>
      </div>
    </>
  );
};

export default CustomerShop;

