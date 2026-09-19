import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { IonIcon } from "@ionic/react";
import {
  logoYoutube, logoInstagram, logoPinterest, logoX,
  logoFacebook, logoTiktok, locationOutline,
} from "ionicons/icons";
import Visa from "../../../../../src/assets/securePayments/visa.png";
import Mastercard from "../../../../../src/assets/securePayments/master-card.png";
import Discover from "../../../../../src/assets/securePayments/discover.png";
import Mpesa from "../../../../../src/assets/securePayments/mpesa.png";
import Paypal from "../../../../../src/assets/securePayments/paypal.png";
import DHL from "../../../../../src/assets/partnaship/DHL.png";
import FedEx from "../../../../../src/assets/partnaship/fedex.png";
import WellsFargo from "../../../../../src/assets/partnaship/wellfargo.jpeg";
import { useAuth } from "../../../../cmponents/Auth/AuthContext/Context";
import api from "../../../../Services/Api";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import "./footer.css";

const Footer = () => {
  const year = new Date().getFullYear();
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "success" });

  const isAdmin = user?.role === "admin";
  const isVendor = user?.role === "vendor";
  const canBecomeVendor = isAuthenticated && !isAdmin && !isVendor;

  const handleSnackbarClose = () => setSnackbar((prev) => ({ ...prev, open: false }));

  const handleBecomeVendor = async (event) => {
    event.preventDefault();

    if (!isAuthenticated) {
      navigate("/customer-login", { state: { from: "/vendor-register-form" } });
      return;
    }

    navigate("/vendor-register-form");
  };

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleSubscribe = async () => {
    const value = email.trim();
    if (!value) {
      setSnackbar({ open: true, severity: "warning", message: "Please enter your email address." });
      return;
    }
    try {
      setLoading(true);
      const response = await api.post("/api/newsletter/subscribe/", { email: value });
      setSnackbar({ open: true, severity: "success", message: response.data?.message || "Subscribed successfully." });
      setEmail("");
    } catch (error) {
      console.error("Newsletter subscription failed:", error);
      setSnackbar({ open: true, severity: "error", message: "Subscription failed. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="mm-footer">
      <div className="mm-footer-inner mm-container">
        <div className="mm-footer-grid">
          <div className="mm-footer-brand">
            <Link to="/" className="mm-footer-logo">Maa Mara Market</Link>
            <p className="mm-footer-muted">
              Discover handmade goods, African design, everyday essentials and independent sellers from across the marketplace.
            </p>
            <p className="mm-footer-contact"><IonIcon icon={locationOutline} aria-hidden="true" />Nairobi, Kenya · East Africa</p>
            <a href="mailto:maamaramarket@gmail.com">maamaramarket@gmail.com</a>
            <a href="tel:+254712345678">+254 712 345 678</a>
            <div className="mm-footer-socials" aria-label="Social media">
              <button type="button" aria-label="Facebook"><IonIcon icon={logoFacebook} /></button>
              <button type="button" aria-label="X"><IonIcon icon={logoX} /></button>
              <button type="button" aria-label="YouTube"><IonIcon icon={logoYoutube} /></button>
              <button type="button" aria-label="Instagram"><IonIcon icon={logoInstagram} /></button>
              <button type="button" aria-label="Pinterest"><IonIcon icon={logoPinterest} /></button>
              <button type="button" aria-label="TikTok"><IonIcon icon={logoTiktok} /></button>
            </div>
          </div>

          <div className="mm-footer-links">
            <div>
              <h3>Company</h3>
              <a href="mailto:maamaramarket@gmail.com?subject=About%20Maa%20Mara%20Market">About Us</a>
              <a href="mailto:maamaramarket@gmail.com?subject=Contact%20Maa%20Mara%20Market">Contact us</a>
              <Link to="/customer-order">Order History</Link>
              <Link to="/request-returns">Returns</Link>
              <a href="mailto:maamaramarket@gmail.com?subject=Shipping%20Question">Shipping</a>
              <a href="mailto:maamaramarket@gmail.com?subject=Career%20Enquiry">Career</a>
            </div>

            <div>
              <h3>Shop</h3>
              <Link to="/list">All products</Link>
              <Link to="/organic">Organic</Link>
              <Link to="/blogs">Journal</Link>
              <Link to="/filter-category">Featured</Link>
              <Link to="/shopping-cart">Cart</Link>
            </div>

            <div>
              <h3>Account</h3>
              <Link to="/user-account">My account</Link>
              <Link to="/profile">Profile</Link>
              {isAuthenticated ? (
                <button type="button" className="mm-footer-action-link mm-footer-logout" onClick={handleLogout}>
                  Log out
                </button>
              ) : (
                <>
                  <Link to="/customer-login">Sign in</Link>
                  <Link to="/register">Sign up</Link>
                </>
              )}
            </div>

            <div>
              <h3>Help</h3>
              {canBecomeVendor && (
                <button type="button" className="mm-footer-action-link" onClick={handleBecomeVendor}>
                  Become a vendor
                </button>
              )}
              <Link to="/send-invitation">Invite friends</Link>
              <Link to="/chat">Chat with us</Link>
              <a href="mailto:maamaramarket@gmail.com?subject=Support%20Request">Support</a>
              <a href="mailto:maamaramarket@gmail.com?subject=Help%20Request">Help</a>
            </div>

            {isAuthenticated && (isAdmin || isVendor) && (
              <div>
                <h3>Dashboard</h3>
                <Link to={isAdmin ? "/admin-dashboard" : "/vendors-dashboard"}>Dashboard</Link>
              </div>
            )}
          </div>

          <div className="mm-footer-subscribe">
            <h3>Stay in the loop</h3>
            <p className="mm-footer-muted">Get new arrivals, marketplace stories and occasional offers.</p>
            <form className="mm-footer-subscribe-form" onSubmit={(event) => { event.preventDefault(); handleSubscribe(); }}>
              <input type="email" placeholder="Email address" aria-label="Email address" value={email}
                onChange={(event) => setEmail(event.target.value)} autoComplete="email" />
              <button type="submit" disabled={loading}>{loading ? "Joining…" : "Join"}</button>
            </form>
            <div className="mm-footer-payment-group">
              <span>Secure payments</span>
              <div><img src={Visa} alt="Visa" /><img src={Mastercard} alt="Mastercard" /><img src={Discover} alt="Discover" /><img src={Mpesa} alt="M-Pesa" /><img src={Paypal} alt="PayPal" /></div>
            </div>
            <div className="mm-footer-payment-group">
              <span>Delivery partners</span>
              <div><img src={DHL} alt="DHL" /><img src={FedEx} alt="FedEx" /><img src={WellsFargo} alt="Wells Fargo" /></div>
            </div>
          </div>
        </div>

        <div className="mm-footer-bottom">
          <span>© {year} Maa Mara Market. All rights reserved.</span>
          <div><span>Kenya · English</span><span>KES</span></div>
        </div>
      </div>

      <Snackbar open={snackbar.open} autoHideDuration={3000} onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}>
        <Alert onClose={handleSnackbarClose} severity={snackbar.severity} sx={{ width: "100%" }} elevation={6} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </footer>
  );
};

export default Footer;
