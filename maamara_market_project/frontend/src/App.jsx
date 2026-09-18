import { ColourModeContext, tokens } from "./theme";
import {
  CssBaseline,
  ThemeProvider,
  CircularProgress,
  useTheme,
} from "@mui/material";
import { Routes, Route } from "react-router-dom";
import { useMode } from "./theme";
import BridgeToHTML from "./globalHtml";
import { AuthProvider, useAuth } from "./cmponents/Auth/AuthContext/Context";
import { useEffect } from "react";
import "./index.css";
import "./main.css";
import "../src/PublicUiForAll/PublicUi/maamara.css";

// Admin Pages
import Dashboard from "./Scenes/Dashboard/Dashboard";
import Vendors from "./Scenes/Vendors/Vendors";
import Bar from "./Scenes/Bar/BarChartsBar";
import Line from "./Scenes/Line/LineChart";
import Pie from "./Scenes/Pie/PieChart";
import FAQ from "./cmponents/FAQ/FAQ";
import Calendar from "./cmponents/Calendar/Calendar";

// Vendor Pages
import Home from "./cmponents/VENDORPAGE/SellerDasboard/Seller";
import ItemFormSheet from "./cmponents/VENDORPAGE/Products/FormSheet/ItemFormSheet";

// Customer Pages
import CustomerShop from "./PublicUiForAll/CustomerShop";

// Layouts
import VendorLayout from "./cmponents/Auth/Routes/RoutesLayout/VendorLayout";

// vendor requests
import VendorItems from "./cmponents/VENDORPAGE/Products/VendorItems/ItemList";

import CustomerLayout from "./cmponents/Auth/Routes/RoutesLayout/CustomerLayout";
import VendorRegistration from "./cmponents/VENDORPAGE/VendorRegistration/Terms&Conditions";
import Main from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Main";
import SingleItem from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/SingleItem/SingleItem";

//popup and notifications
import { Toaster } from "../components/ui/toaster";
import { ToastProvider } from "../components/ui/toast";

// chat
import Chat from "../ChatJsxUi/client-app/srcChat/componentChat/chat/Chat";
import Join from "../ChatJsxUi/client-app/srcChat/componentChat/join/Join";
import VendorItemRequestDetail from "./cmponents/AdminPages/Notifications/VendorItemRequestDetail";

// ✅ ProtectedRoute wrapper
import ProtectedRoute from "./cmponents/Auth/Routes/ProtectRoute";
import { CartProvider } from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/cart";
import { baseUrl } from "./cmponents/Constant/Constant";
import useRealtimeEvents from "./Services/useRealtimeEvents";


// interactions
import OffCanvasMenu from "./PublicUiForAll/PublicUi/Customer/DesktopView/Header/Offcanvas";
import SingleCategory from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CategoryFilter";
import ScrollTop from "./cmponents/Scroll/SceollToTheTop";
import BlogCard from "./cmponents/VENDORPAGE/Blogs/BlogCard";
import BlogFeed from "./cmponents/VENDORPAGE/Blogs/BlogFeed";
import SingleBlogPage from "./cmponents/VENDORPAGE/Blogs/SinglePageBlogPost";
import { WishlistProvider } from "./cmponents/Hooks/WishListHook/Wishlist";
// link admin css
import "./admin.css"
import InviteFriends from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Referals/Referals";
import UserAccount from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/Account";
import CartPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/CartPage";
import CustomerPage from "./cmponents/VENDORPAGE/Home/TopBox/CustomerPage";
import VendorSalesPage from "./cmponents/VENDORPAGE/ChartBox/ChartData/HomeChartData/VendorSalesPage";

import SingleItemProfileNotif from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleItemProfileNotif";
import SubcategoryProducts from "./PublicUiForAll/PublicUi/Customer/DesktopView/Header/subcategoryListItem";
import OrganicPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/OrganicAdvert/OrganicPage";
import PayoutSuccess from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PayoutSuccess";
import AuthSuccess from "./cmponents/Auth/AdminLogin/Auth-Success-Check";
import VendorSuccessPage from "./cmponents/VENDORPAGE/VendorRegistration/VendorSuccessPage";
import SingleBannerPage from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleBannerPage";

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [theme, colorMode] = useMode();
  const themeSetup = useTheme();
  const colors = tokens(themeSetup.palette.mode);

  useRealtimeEvents(() => {});

  useEffect(() => {
    // Only call the API to set the visitor token cookie
    fetch(`${baseUrl}/api/vistor-token/`, {
      method: "GET",
      credentials: "include", // Important! Sends cookies and allows the server to set cookies
    })
      .then(res => {
        if (!res.ok) throw new Error("Failed to get visitor token");
        console.log("Visitor token cookie set by server");
      })
      .catch(err => console.error(err));
  }, []);
  

  useEffect(() => {
    console.log("Authenticated:", isAuthenticated);
  }, [isAuthenticated]);

  if (loading) {
    return (
      <div
    
        style={{
          backgroundColor: colors.primary[500],
          color: colors.gray[500],
        }}
        className="loader-screen flex justify-center items-center h-screen"
      >
        <CircularProgress />
      </div>
    );
  }

  return (
    <ColourModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <BridgeToHTML />
        <CssBaseline />
        <div className="app">
          <div
            id="page"
            className="site page-home"
            style={{
              backgroundColor: "white",
              color: "black",
              width: "100%",
              height: "auto",
            }}
          >
            <ScrollTop/>
            <OffCanvasMenu/>
            
            <Routes>
              {/* Public Customer View */}
              <Route path="/" element={<CustomerShop />}>
                <Route index element={<Main />} />
                
                <Route path="vendor-register-form" element={<VendorRegistration />} />
                
                <Route path="filter-category" element={<SingleCategory />} />
                <Route path="item/:itemId" element={<SingleItem />} />
                <Route path="join-chat" element={<Join />} />
                <Route path="chat" element={<Chat />} />

                {/* blogs */}
                <Route path="blogs" element={<BlogFeed />} />
                <Route path="/blogs/:id" element={<SingleBlogPage />} />


                {/* invite a friend */}
                <Route path="send-invitation" element={<InviteFriends />} />
                <Route path="user-account" element={<UserAccount />} />
                {/* profile */}

                {/* Route for subcategory products */}
                <Route path="subcategory/:id/products" element={<SubcategoryProducts />} />

                {/* Route for unified auth check for normal login and google */}
                <Route path="login/auth-success" element={<AuthSuccess />} />
              </Route>
            </Routes>
          </div>
        </div>
      </ThemeProvider>
    </ColourModeContext.Provider>
  );
}

function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent />
        </WishlistProvider>
      </CartProvider>
    </AuthProvider>
  );
}

export default App;
