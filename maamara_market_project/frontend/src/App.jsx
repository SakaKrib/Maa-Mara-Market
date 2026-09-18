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
import LoginForm from "./cmponents/Auth/AdminLogin/AdminLogin";
import { AuthProvider, useAuth } from "./cmponents/Auth/AuthContext/Context";
import { useEffect } from "react";
import "./index.css";
import "./main.css";
import "../src/PublicUiForAll/PublicUi/maamara.css";

// Admin Pages
import Dashboard from "./Scenes/Dashboard/Dashboard";
import Vendors from "./Scenes/Vendors/Vendors";
import PaymentReport from "./Scenes/PayoutReports/VendorReport";
import Bar from "./Scenes/Bar/BarChartsBar";
import Line from "./Scenes/Line/LineChart";
import Pie from "./Scenes/Pie/PieChart";
import FAQ from "./cmponents/FAQ/FAQ";
import Calendar from "./cmponents/Calendar/Calendar";
import Single from "./cmponents/SinglePage/SinglePage";

// Vendor Pages
import Home from "./cmponents/VENDORPAGE/SellerDasboard/Seller";
import ItemFormSheet from "./cmponents/VENDORPAGE/Products/FormSheet/ItemFormSheet";
import ItemCreateDrawer from "./cmponents/VENDORPAGE/Products/Forms/DrawerCreateNewItem/Drawer";

// Customer Pages
import CustomerShop from "./PublicUiForAll/CustomerShop";

// Layouts
import AdminLayout from "./cmponents/Auth/Routes/RoutesLayout/AdminLayot";
import VendorLayout from "./cmponents/Auth/Routes/RoutesLayout/VendorLayout";

// vendor requests
import useDashboardInteractions from "./interaction";
import VendorItems from "./cmponents/VENDORPAGE/Products/VendorItems/ItemList";
import AdminCreateItemForVendor from "./cmponents/VENDORPAGE/Products/Forms/VendorItemRequest/VendorCreateItemForm";
import VendorItemCreateRequests from "./cmponents/VENDORPAGE/Products/VendorItems/AdminApproveDenyItemCreate";

import CustomerLayout from "./cmponents/Auth/Routes/RoutesLayout/CustomerLayout";
import VendorRegistration from "./cmponents/VENDORPAGE/VendorRegistration/Terms&Conditions";
import LoginPage from "./PublicUiForAll/PublicUi/Customer/LoginForm";
import RegisterPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Register";
import Main from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Main";
import OTPVerification from "./cmponents/VENDORPAGE/VendorRegistration/VendorOTP";
import SingleItem from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/SingleItem/SingleItem";

//popup and notifications
import { Toaster } from "../components/ui/toaster";
import { ToastProvider } from "../components/ui/toast";

// chat
import Chat from "../ChatJsxUi/client-app/srcChat/componentChat/chat/Chat";
import Join from "../ChatJsxUi/client-app/srcChat/componentChat/join/Join";
import UiForVendorRequest from "./cmponents/Admin/VendorRequestUi";
import VendorItemRequestDetail from "./cmponents/AdminPages/Notifications/VendorItemRequestDetail";
import AdminPriceRequestDetail from "./cmponents/AdminPages/Notifications/AdminApprovePriceChangeRequest";
import SingleVendorProfile from "./cmponents/VENDORPAGE/VendorSections/VendorProfile";
import PayoutsPage from "./cmponents/VendorPayoutReport/vendorPayouts/vendorPayouts";

// ✅ ProtectedRoute wrapper
import ProtectedRoute from "./cmponents/Auth/Routes/ProtectRoute";
import HomeRedirectWrapper from "./cmponents/Auth/AuthContext/ProtectVendorAdmin";
import { CartProvider } from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/cart";
import { baseUrl } from "./cmponents/Constant/Constant";
import useRealtimeEvents from "./Services/useRealtimeEvents";
import CheckoutPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/CheckoutForm";


// interactions
import useMobileMenu from "./MobileInterractions";
import OffCanvasMenu from "./PublicUiForAll/PublicUi/Customer/DesktopView/Header/Offcanvas";
import SingleCategory from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CategoryFilter";
import ScrollTop from "./cmponents/Scroll/SceollToTheTop";
import CheckoutPaypalPayment from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/Payment/Paypal";
import MpesaC2BPayment from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/Payment/Mpesac2b";
import SingleItemProfile from "./cmponents/VENDORPAGE/VendorSections/ItemSinglePage";
import PaymentSuccess from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/SuccessPage";
import BlogCard from "./cmponents/VENDORPAGE/Blogs/BlogCard";
import BlogFeed from "./cmponents/VENDORPAGE/Blogs/BlogFeed";
import SingleBlogPage from "./cmponents/VENDORPAGE/Blogs/SinglePageBlogPost";
import { WishlistProvider } from "./cmponents/Hooks/WishListHook/Wishlist";
import ItemsOnsite from "./cmponents/VENDORPAGE/Products/VendorItems/ItemOnSite";
import TransactionTable from "./cmponents/VENDORPAGE/Home/Transction";
import AdminAccounts from "./cmponents/Admin/AccountMain/Accountmain";
// link admin css
import "./admin.css"
import InviteFriends from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Referals/Referals";
import UserAccount from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/Account";
import PublicProfile from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/Profile-User-Visitor";
import CartPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/CartPage";
import RequestReturnForm from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Return/Return";
import CustomerToAdminRequests from "./cmponents/Admin/CustomerRequests/CustomerRequests";
import VendorPendingOrdersTable from "./cmponents/VENDORPAGE/Home/Orders/VendorPendingOrders";
import AdminPayoutTriggerPayment from "./cmponents/VendorPayoutReport/vendorPayouts/Business2Customer";
import MpesaB2CPayment from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/mpesa";
import MpesaB2CMultiPayment from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PayManyVendors";
import PaypalBulkPayment from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PaypalPayVendor";
import BankTransferBulkPayment from "./cmponents/VendorPayoutReport/vendorPayouts/BankTransfer";
import SuccessPage from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/SuccessPagePayout";
import CustomerPage from "./cmponents/VENDORPAGE/Home/TopBox/CustomerPage";
import VendorSalesPage from "./cmponents/VENDORPAGE/ChartBox/ChartData/HomeChartData/VendorSalesPage";
import GrowthPage from "./cmponents/Hooks/ItemStats/ItemstatsPage";
import VendorStatsPage from "./cmponents/Hooks/ItemStats/VendoItemStatPage";
import PendingOrdersPage from "./cmponents/Hooks/ItemStats/PendingOrderPage";

import { Link } from "react-router-dom";
import ReviewsPage from "./cmponents/VENDORPAGE/Home/TopBox/VendorReviewPage";
import VendorOrdersPage from "./cmponents/Hooks/Order/OrderPage";
import SalesReportPage from "./cmponents/VENDORPAGE/Home/Orders/SalesRegister";
import SingleItemProfileNotif from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleItemProfileNotif";
import SubcategoryProducts from "./PublicUiForAll/PublicUi/Customer/DesktopView/Header/subcategoryListItem";
import SearchResultsPage from "./PublicUiForAll/PublicUi/Navigations/Search/NavIcons/ResustsPage";
import OrganicPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/OrganicAdvert/OrganicPage";
import MpesaPayoutSuccess from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PayoutSuccess";
import PayoutSuccess from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PayoutSuccess";
import AuthSuccess from "./cmponents/Auth/AdminLogin/Auth-Success-Check";
import ResetPassword from "./cmponents/Auth/AdminLogin/ResetLink";
import ForgotPassword from "./cmponents/Auth/AdminLogin/RecorverPasword";
import SalesPage from "./cmponents/Admin/AdminAccounts/Reports/SalesStatsPage";
import RevenueGrowthCard from "./cmponents/AdminPages/Notifications/Transactions/AdminTransactionGrowthTrack";
import VendorSuccessPage from "./cmponents/VENDORPAGE/VendorRegistration/VendorSuccessPage";
import CreateItemModal from "./cmponents/AdminPages/Notifications/ApproveCreatedItem";
import AdminBannerApprovalPage from "./cmponents/Admin/ApproveBanner/aprroveBanner";
import SingleBannerPage from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleBannerPage";
import VendorBannerManager from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleBannerPage";
import VendorBlogManagerNotification from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/BlogsSinglePage";
import SearchGlobalResultsPage from "./cmponents/SearchPage/SearchResultsPage";

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [theme, colorMode] = useMode();
  const themeSetup = useTheme();
  const colors = tokens(themeSetup.palette.mode);\n\n  useRealtimeEvents(() => {});

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