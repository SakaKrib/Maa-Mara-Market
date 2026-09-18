import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  logoYoutube,
  logoInstagram,
  logoPinterest,
  logoX,
  logoFacebook,
  logoTiktok,
  locationOutline
} from "ionicons/icons";
import Visa from "../../../../assets/securePayments/visa.png";
import Mastercard from "../../../../assets/securePayments/master-card.png";
import Discover from "../../../../assets/securePayments/discover.png";
import Mpesa from "../../../../assets/securePayments/mpesa.png";
import Paypal from "../../../../assets/securePayments/paypal.png";
import DHL from "../../../../assets/partnaship/DHL.png";
import FedEx from "../../../../assets/partnaship/fedex.png";
import WellsFargo from "../../../../assets/partnaship/wellfargo.jpeg";
import { useAuth } from "../../../../cmponents/Auth/AuthContext/Context";
import api from "../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

const Footer = () => {
  const year = new Date().getFullYear();
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const isCustomer = user?.role === "customer";
  const isVendor = user?.role === "vendor";
  const isAdmin = user?.role === "admin";

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "success",
  });

  const handleSnackbarClose = () => {
    setSnackbar((prev) => ({ ...prev, open: false }));
  };

  const handleSellClick = async (e) => {
    e.preventDefault();

    try {
      const response = await api.get("/api/check-auth/", {
        withCredentials: true,
      });

      const data = response.data;

      if (data?.isAuthenticated) {
        window.location.href = "/vendor-register-form";
      } else {
        setSnackbar({
          open: true,
          severity: "warning",
          message: "You need to login or register first to sell your products!",
        });

        setTimeout(() => {
          navigate("/customer-login", {
            state: { from: "/vendor-register-form" },
          });
        }, 1200);
      }
    } catch (err) {
      console.error("Auth check failed:", err);
      setSnackbar({
        open: true,
        severity: "error",
        message: "Something went wrong. Please try again.",
      });
    }
  };

  const handleSubscribe = async () => {
    if (!email) {
      setSnackbar({
        open: true,
        message: "Please enter an email",
        severity: "warning",
      });
      return;
    }

    try {
      setLoading(true);

      const res = await api.post("/api/newsletter/subscribe/", {
        email,
      });

      setSnackbar({
        open: true,
        message: res.data.message || "Subscribed successfully",
        severity: "success",
      });

      setEmail("");
    } catch (err) {
      setSnackbar({
        open: true,
        message: "Subscription failed. Try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer>
      <div className="px-4 py-24 md:px-8 lg:px-6 xl:px-64 bg-gray-100 text-sm mt-24 xxs:block">
        {/* top */}
        <div className="flex justify-between gap-24 md:flex-row xxs:flex-col">
          {/* left */}
          <div className="flex flex-col gap-8 w-full md:w-auto lg:w-1/4">
            <Link to="/">
              <div className="text-2xl tracking-wide">MaaMaraMarket</div>
            </Link>

            <p>
              <IonIcon className="text-md mr-2" icon={locationOutline} />
              14354 RedHill Road Kitisuru, Westlands, Nairobi 0100, KE, East Africa
            </p>

            <span className="font-semibold">maamaramarket@gmail.com</span>
            <span className="font-semibold">+254712345678</span>

            <div className="flex gap-6 text-lg">
              <IonIcon icon={logoFacebook} />
              <IonIcon icon={logoX} />
              <IonIcon icon={logoYoutube} />
              <IonIcon icon={logoInstagram} />
              <IonIcon icon={logoPinterest} />
              <IonIcon icon={logoTiktok} />
            </div>
          </div>

          {/* center */}
          <div className="hidden lg:grid grid-cols-3 gap-12 w-2/3">
            {/* COMPANY */}
            <div className="flex flex-col gap-4">
              <h1 className="font-semibold text-lg mb-2">COMPANY</h1>
              <Link to="/about-us">About Us</Link>
              <Link to="#">Contact us</Link>
              <Link to="#">Order History</Link>
              <Link to="#">Shipping</Link>
              <Link to="/support">Support</Link>
              <Link to="/help/faq">Help</Link>
              <Link to="#">Returns</Link>
              <Link to="/careers/jobs">Career</Link>
            </div>

            {/* SHOP */}
            <div className="flex flex-col gap-4">
              <h1 className="font-semibold text-lg mb-2">SHOP</h1>
              <Link to="#">New Arrivals</Link>
              <Link to="#">Trending</Link>
              <Link to="#">Women</Link>
              <Link to="#">Men</Link>
              <Link to="#">Children</Link>
              <Link to="#">Unisex</Link>
              <Link to="#">Home Decor</Link>
            </div>

            {/* HELP + DASHBOARD */}
            <div className="flex flex-col gap-4">
              <h1 className="font-semibold text-lg mb-2">HELP</h1>
              <Link to="#">Customer Service</Link>

              {isCustomer && (
                <Link to="#" onClick={handleSellClick}>
                  Sell
                </Link>
              )}

              <Link to="#">My Account</Link>
              <Link to="#">Legal & Privacy</Link>
              <Link to="#">Buy Gift Cards</Link>

              {isAuthenticated && (isAdmin || isVendor) && (
                <>
                  <h1 className="font-semibold text-lg mt-6">DASHBOARD</h1>
                  <Link to={isAdmin ? "/admin-dashboard" : "/vendors-dashboard"}>
                    Dashboard
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* right */}
          <div className="flex flex-col gap-8 w-full md:w-auto lg:w-1/4">
            <h1 className="font-medium text-lg">SUBSCRIBE</h1>

            <p>
              Get our latest news and shop deals about trends, promotions, and much more!
            </p>

            <div className="flex">
              <input
                type="email"
                placeholder="Email Address"
                className="p-4 w-3/4"
                name="email"
                id="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <button
                type="button"
                onClick={handleSubscribe}
                className="w-1/4 primary-button text-white"
                disabled={loading}
              >
                Join
              </button>
            </div>

            <span className="font-semibold">Secure Payments</span>
            <div className="flex justify-between">
              <img className="w-20 h-10" src={Visa} alt="Visa" />
              <img className="w-20 h-10" src={Mastercard} alt="Mastercard" />
              <img className="w-20 h-10" src={Discover} alt="Discover" />
              <img className="w-20 h-10" src={Mpesa} alt="M-Pesa" />
              <img className="w-20 h-10" src={Paypal} alt="PayPal" />
            </div>

            <span className="font-semibold">Partnership</span>
            <div className="flex justify-between">
              <img className="w-20 h-10" src={DHL} alt="DHL" />
              <img className="w-20 h-10" src={FedEx} alt="FedEx" />
              <img className="w-20 h-10" src={WellsFargo} alt="Wells Fargo" />
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-300 mt-16 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-600 text-sm gap-4">
          <span>© {year} MaaMaraMarket. All rights reserved.</span>

          <div className="flex flex-col md:flex-row items-center gap-4">
            <div>
              <span className="text-gray-500 mr-2">Language:</span>
              <span className="font-medium text-gray-800">Kenya | English</span>
            </div>
            <div>
              <span className="text-gray-500 mr-2">Currency:</span>
              <span className="font-medium text-gray-800">KES</span>
            </div>
          </div>
        </div>
      </div>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: "100%" }}
          elevation={6}
          variant="filled"
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </footer>
  );
};

export default Footer;
