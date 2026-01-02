import { Outlet } from "react-router-dom";
import Header from "../PublicUiForAll/PublicUi/Customer/DesktopView/Header/Header";
import Footer from "./PublicUi/Navigations/Footer/Footer";
import MobileMenu from "./PublicUi/Navigations/Footer/MobileFooter";

const CustomerShop = () => {
  return (
    <>
      <Header />
      <main className="relative h-max">
        <Outlet />
      </main>
      <MobileMenu/>
      <Footer />
    </>
  );
};

export default CustomerShop;

