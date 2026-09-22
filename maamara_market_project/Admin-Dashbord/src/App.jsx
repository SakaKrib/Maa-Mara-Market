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
import { useEffect, useState } from "react";
import "./main.css";
import "../src/PublicUiForAll/PublicUi/maamara.css";

// Admin Pages
import Dashboard from "./Scenes/Dashboard/Dashboard";
import InboundTraffic from "./Scenes/InboundTraffic/InboundTraffic";
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
import VendorItems from "./cmponents/VENDORPAGE/Products/VendorItems/ItemList";
import VendorItemCreateRequests from "./cmponents/VENDORPAGE/Products/VendorItems/AdminApproveDenyItemCreate";

import VendorRegistration from "./cmponents/VENDORPAGE/VendorRegistration/Terms&Conditions";
import LoginPage from "./PublicUiForAll/PublicUi/Customer/LoginForm";
import RegisterPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Register";
import VerifyRegistrationNewUser from "../components/VerifyRegistrationNewUser";
import Main from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Main";
import OTPVerification from "./cmponents/VENDORPAGE/VendorRegistration/VendorOTP";
import SingleItem from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/SingleItem/SingleItem";

//popup and notifications
import { Toaster } from "../components/ui/toaster";
import { ToastProvider } from "../components/ui/toast";

// chat
import Messaging from "./cmponents/Messaging/Messaging";
import UiForVendorRequest from "./cmponents/Admin/VendorRequestUi";
import VendorItemRequestDetail from "./cmponents/AdminPages/Notifications/VendorItemRequestDetail";
import AdminPriceRequestDetail from "./cmponents/AdminPages/Notifications/AdminApprovePriceChangeRequest";
import SingleVendorProfile from "./cmponents/VENDORPAGE/VendorSections/VendorProfile";
import PayoutsPage from "./cmponents/VendorPayoutReport/vendorPayouts/vendorPayouts";
import VendorSettings from "./cmponents/VENDORPAGE/VendorSettings";

// ✅ ProtectedRoute wrapper
import ProtectedRoute from "./cmponents/Auth/Routes/ProtectRoute";
import HomeRedirectWrapper from "./cmponents/Auth/AuthContext/ProtectVendorAdmin";
import { CartProvider } from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/cart";
import CheckoutPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/CheckoutForm";


// interactions
import useMobileMenu from "./MobileInterractions";
import SingleCategory from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CategoryFilter";
import ScrollTop from "./cmponents/Scroll/ScrollToTheTop";
import CheckoutPaypalPayment from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/Payment/Paypal";
import MpesaC2BPayment from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Orders/Payment/MpesaStkPayment";
import SingleItemProfile from "./cmponents/VENDORPAGE/VendorSections/ItemSinglePage";
import PaymentSuccess from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/SuccessPage";
import BlogCard from "./cmponents/VENDORPAGE/Blogs/BlogCard";
import BlogFeed from "./cmponents/VENDORPAGE/Blogs/BlogFeed";
import SingleBlogPage from "./cmponents/VENDORPAGE/Blogs/SinglePageBlogPost";
import { WishlistProvider } from "./cmponents/Hooks/WishListHook/Wishlist";
import api from "./Services/Api";
import ItemsOnsite from "./cmponents/VENDORPAGE/Products/VendorItems/ItemOnSite";
import TransactionTable from "./cmponents/VENDORPAGE/Home/Transaction";
import AdminAccounts from "./cmponents/Admin/AccountMain/Accountmain";
import Settings from "./cmponents/Settings/Settings";
import { AdminPreferencesProvider } from "./cmponents/Settings/AdminPreferencesContext";
// link admin css
import "./admin.css"
import InviteFriends from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Referals/Referals";
import UserAccount from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/Account";
import CustomerOrdersDashboard from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/CustomerOrder";
import BrandPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/BrandPage";
import Brands from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/Brands";
import PublicProfile from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Accounts/Profile-User-Visitor";
import CartPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/CartHook/CartPage";
import RequestReturnForm from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Return/Return";
import CareerPage from "./PublicUiForAll/PublicUi/Navigations/Footer/Career/Career";
import CareerDetails from "./PublicUiForAll/PublicUi/Navigations/Footer/Career/CareerDetails";
import CustomerFAQ from "./PublicUiForAll/PublicUi/Navigations/Footer/FAQ/CustomerFAQ";
import Support from "./PublicUiForAll/PublicUi/Navigations/Footer/Support/Support";
import AboutUs from "./PublicUiForAll/PublicUi/Navigations/Footer/AboutUs";
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
import VendorActivitiesPage from "./cmponents/VENDORPAGE/SellerDasboard/VendorActivitiesPage";

import { Link } from "react-router-dom";
import ReviewsPage from "./cmponents/VENDORPAGE/Home/TopBox/VendorReviewPage";
import VendorOrdersPage from "./cmponents/Hooks/Order/OrderPage";
import SalesReportPage from "./cmponents/VENDORPAGE/Home/Orders/SalesRegister";
import SingleItemProfileNotif from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleItemProfileNotif";
import SubcategoryProducts from "./PublicUiForAll/PublicUi/Customer/DesktopView/Header/subcategoryListItem";
import SearchResultsPage from "./PublicUiForAll/PublicUi/Navigations/Search/NavIcons/ResultsPage";
import OrganicPage from "./PublicUiForAll/PublicUi/Customer/DesktopView/Main/Trending/OrganicAdvert/OrganicPage";
import PayoutSuccess from "./cmponents/VendorPayoutReport/vendorPayouts/Payments/PayoutSuccess";
import AuthSuccess from "./cmponents/Auth/AdminLogin/Auth-Success-Check";
import ResetPassword from "./cmponents/Auth/AdminLogin/ResetLink";
import ForgotPassword from "./cmponents/Auth/AdminLogin/RecoverPassword";
import SalesPage from "./cmponents/Admin/AdminAccounts/Reports/SalesStatsPage";
import RevenueGrowthCard from "./cmponents/AdminPages/Notifications/Transactions/AdminTransactionGrowthTrack";
import VendorSuccessPage from "./cmponents/VENDORPAGE/VendorRegistration/VendorSuccessPage";
import CreateItemPage from "./cmponents/AdminPages/Notifications/CreateItemPage";
import AdminCreateNewVendorItemPage from "./cmponents/AdminPages/Notifications/AdminCreateNewVendorItemPage";
import AdminBannerApprovalPage from "./cmponents/Admin/ApproveBanner/ApproveBanner";
import AdminPostCareer from "./cmponents/AdminPages/Notifications/PostCareers/AdminPostCareer";
import SupportAdminPanel from "./cmponents/AdminPages/Notifications/Support/SupportMessages";
import VendorBannerManager from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/SingleBannerPage";
import VendorBlogManagerNotification from "./cmponents/VENDORPAGE/VendorSections/NotificationPages/BlogsSinglePage";
import SearchGlobalResultsPage from "./cmponents/SearchPage/SearchResultsPage";

function AppContent() {
  const { loading } = useAuth();
  const [theme, colorMode] = useMode();
  const themeSetup = useTheme();
  const colors = tokens(themeSetup.palette.mode);

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
           
            
            <Routes>
              {/* Public Customer View */}
              <Route path="/" element={<CustomerShop />}>
                <Route index element={<Main />} />
                
                <Route path="vendor-register-form" element={<VendorRegistration />} />
                
                <Route path="filter-category" element={<SingleCategory />} />
                <Route path="item/:itemId" element={<SingleItem />} />
                <Route path="messages" element={<Messaging />} />

                {/* blogs */}
                <Route path="blogs" element={<BlogFeed />} />
                <Route path="/blogs/:id" element={<SingleBlogPage />} />


                {/* invite a friend */}
                <Route path="send-invitation" element={<InviteFriends />} />
                <Route path="user-account" element={<UserAccount />} />
                <Route path="customer-order" element={<CustomerOrdersDashboard />} />
                <Route path="brands" element={<Brands />} />
                <Route path="brands/:id" element={<BrandPage />} />
                {/* profile */}

                {/* Route for subcategory products */}
                <Route path="subcategory/:id/products" element={<SubcategoryProducts />} />

                {/* Route for unified auth check for normal login and google */}
                <Route path="login/auth-success" element={<AuthSuccess />} />

               
               

              </Route>

              {/* Public customer pages outside the outlet tree still use the same storefront shell. */}
              <Route element={<CustomerShop />}>
                <Route path="list" element={<SearchResultsPage />} />
                <Route path="customer-login" element={<LoginPage />} />
                <Route path="register" element={<RegisterPage />} />
                <Route path="verify-otp" element={<VerifyRegistrationNewUser />} />
                <Route path="checkout-page" element={<CheckoutPage />} />
                <Route path="paypal-make-payment" element={<CheckoutPaypalPayment />} />
                <Route path="mpesa-make-payment" element={<MpesaC2BPayment />} />
                <Route path="payment-success" element={<PaymentSuccess />} />
                <Route path="profile" element={<PublicProfile />} />
                <Route path="otp-vendor-verification" element={<OTPVerification />} />
                <Route path="shopping-cart" element={<CartPage />} />
                <Route path="organic" element={<OrganicPage />} />
                <Route path="request-returns" element={<RequestReturnForm />} />
                <Route path="careers/jobs" element={<CareerPage />} />
                <Route path="careers/:id" element={<CareerDetails />} />
                <Route path="faq" element={<CustomerFAQ />} />
                <Route path="about-us" element={<AboutUs />} />
                <Route path="support" element={<Support />} />
                <Route path="messages" element={<Messaging />} />
              </Route>

              {/* Login */}
              <Route
                path="/login"
                element={
                  <HomeRedirectWrapper>
                    <LoginForm />
                  </HomeRedirectWrapper>
                }
              />

              {/* vendor success page */}
              <Route path="vendor-success-page" element={ <VendorSuccessPage/>}/>


               {/* reset link */}
               <Route path="/reset-password/:uid/:token" element={<ResetPassword />} />

                {/* forgot password btn */}
                <Route path="/forgot-password" element={<ForgotPassword />} />

              {/* Protected Admin Routes */}
              <Route path="/admin-dashboard/*" element={<ProtectedRoute requiredRole="admin"><AdminLayout /></ProtectedRoute>}>
              <Route index element={<Dashboard />} />
              <Route path="inbound-traffic" element={<InboundTraffic />} />
              <Route path="vendors" element={<Vendors />} />
              <Route path="vendor-payout" element={<PaymentReport />} />
              <Route path="faq" element={<FAQ />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="bar-chart" element={<Bar />} />
              <Route path="line-chart" element={<Line />} />
              <Route path="pie-chart" element={<Pie />} />
              <Route path="vendors/:vendorId" element={<Single />} />
              <Route path="vendor/create-items/requests" element={<VendorItemCreateRequests />} />
              <Route path="vendor-requests" element={<UiForVendorRequest />} />
              <Route path="vendorDashboard/vendoritemrequest/:id" element={<VendorItemRequestDetail />} />
              <Route path="vendorDashboard/vendoritemPricerequest/:id" element={<AdminPriceRequestDetail />} />
              
              {/* admin accounts */}
              <Route path="Accounts" element={<AdminAccounts />} />
              <Route path="settings" element={<Settings />} />

              {/* returns for approval */}
              <Route path="customer-requests" element={<CustomerToAdminRequests />} />
              <Route path="careers" element={<AdminPostCareer />} />
              <Route path="create-career" element={<AdminPostCareer />} />
              <Route path="support" element={<SupportAdminPanel />} />
              <Route path="create-support" element={<SupportAdminPanel />} />

              {/* vendor create new item */}
              <Route path="vendor/create-item/:requestId" element={<CreateItemPage />} />
              <Route path="vendor/create-item" element={<AdminCreateNewVendorItemPage />} />

               {/* vendor create new item */}
               <Route path="approve-banner" element={<AdminBannerApprovalPage />} />

              {/* generate payouts */}
              <Route path="vendor-payout/payment-trigger" element={<AdminPayoutTriggerPayment />} />

              {/* payments route */}
              <Route path="vendor-payout/payment-trigger/mpesa-payment/single-vendor" element={<MpesaB2CPayment />} />
              <Route path="vendor-payout/payment-trigger/mpesa-payment-group" element={<MpesaB2CMultiPayment />} />

              {/* paypal */}
              <Route path="vendor-payout/payment-trigger/paypal-payment-group" element={<PaypalBulkPayment />} />

              {/* bank transfer */}
              <Route path="vendor-payout/payment-trigger/bank-transfer-payment-group" element={<BankTransferBulkPayment />} />

              {/* successpage payout */}
              {/* <Route path="payout/success/:reference" element={<SuccessPage />} /> */}

              {/* payout success page */}
              <Route path="vendor-payout/payment-trigger/mpesa-payment/single-vendor/vendor-payouts/success/:reference" element={<PayoutSuccess />} />
              
              
              {/* sales stats page */}
              <Route path="sales-Analytics" element={<SalesPage />} />

              {/* Transaction Growth */}
              <Route path="sales-Analytics/transaction-growth-track" element={<RevenueGrowthCard />} />

              {/* search global results route */}
              <Route path="search/global-results" element={<SearchGlobalResultsPage />} />

              {/* chat */}
              <Route path="messages" element={<Messaging />} />
            </Route>


              {/* Protected Vendor Routes */}
              <Route
                path="/vendors-dashboard/*"
                element={
                  <ProtectedRoute requiredRole="vendor">
                    <VendorLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Home />} />
                <Route path="item-update-post" element={<ItemFormSheet />} />
                <Route path="create-item" element={<ItemCreateDrawer />} />
                <Route path="add-item" element={<VendorItems />} />
                <Route path="vendor-profile" element={<SingleVendorProfile />} />
                <Route path="settings" element={<VendorSettings />} />
                <Route path="vendor-payouts/payout-report" element={<PayoutsPage />} />
                <Route path="item-onsite/items/:id" element={<SingleItemProfile />} />

                {/* Item on site */}
                <Route path="item-onsite" element={<ItemsOnsite />} />

                {/* transactions */}
                <Route path="transactions" element={<TransactionTable />} />

                {/* calender */}
                <Route path="vendor-calender" element={<Calendar />} />

                {/* vendor review page */}
                <Route path="review-page" element={<ReviewsPage />} />


                {/* customer route */}
                <Route path="customers" element={<CustomerPage />} />

                {/* homepage view all */}
                <Route path="vendor-sales" element={<VendorSalesPage />} />
                <Route path="item-stats" element={<GrowthPage />} />
                <Route path="item-views" element={<VendorStatsPage />} />
                <Route path="order-stats" element={<PendingOrdersPage />} />
                <Route path="activities" element={<VendorActivitiesPage />} />


                {/* pending orders table */}
                <Route path="pending-orders" element={<VendorPendingOrdersTable />} />
                <Route path="orders" element={<VendorOrdersPage />} />

                {/* sales report */}
                <Route path="sales/report" element={<SalesReportPage />} />

                {/* NOTIFICATION ROUTES */}
                <Route path="vendor/items/:id" element={<SingleItemProfileNotif />} />

                {/* banners single page */}
                <Route path="vendor/banners/:id" element={<VendorBannerManager />} />

                {/* blogs signle page */}
                <Route path="vendor/blogs/:id" element={<VendorBlogManagerNotification />} />

                <Route path="search/global-results" element={<SearchGlobalResultsPage />} />
                <Route path="messages" element={<Messaging />} />
                
              </Route>

              {/* Unauthorized Fallback */}
              <Route path="/unauthorized" element={<div className="h-screen w-full flex justify-center items-center">
                <div className="flex flex-col">
                  <h1 className="mb-5">Unauthorized Access</h1>
                  <h5 className="mb-5 text-center font-semibold text-lg">oops! it seems you are not Authenticated</h5>
                  <div className="flex justify-center">
                  <Link to="/login" className="mb-5 ring ring-1 hover:bg-blue-500 flex justify-center w-fit py-2 px-4 rounded-full bg-blue-200 hover:text-gray-100">Login</Link>
                  </div>
                </div>
              </div>} />

              {/* Catch-all Fallback */}
              <Route path="*" element={
                <div className="h-screen w-full flex justify-center items-center">
                <div className="flex flex-col">
                  <h1 className="mb-5">Page not found!</h1>
                  <h5 className="mb-5 text-center font-semibold text-lg">Oops! Looks empty in here!</h5>
                  <div className="flex justify-center">
                  <Link className="mb-5 ring ring-1 hover:bg-blue-500 flex justify-center w-fit py-2 px-4 rounded-full bg-blue-200 hover:text-gray-100">Home page</Link>
                  </div>
                </div>
              </div>
              } />
            </Routes>

          </div>
        </div>
      </ThemeProvider>
    </ColourModeContext.Provider>
  );
}

function App() {
  useMobileMenu();

  const [visitorReady, setVisitorReady] = useState(false);

  useEffect(() => {
    let active = true;

    api.get("/api/vistor-token/")
      .then(() => {
        if (active) setVisitorReady(true);
      })
      .catch((error) => {
        console.error("Visitor token initialization failed:", error);
        if (active) setVisitorReady(true);
      });

    return () => {
      active = false;
    };
  }, []);

  if (!visitorReady) {
    return (
      <div className="loader-screen flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return (
    <ToastProvider>
      <CartProvider>
        <WishlistProvider>
          <AdminPreferencesProvider>
            <AppContent />
          </AdminPreferencesProvider>
        </WishlistProvider>
      </CartProvider>
      <Toaster />
    </ToastProvider>
  );
}

export default App;
