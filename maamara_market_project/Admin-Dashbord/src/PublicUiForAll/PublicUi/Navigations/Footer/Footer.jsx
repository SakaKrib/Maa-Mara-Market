import { Link } from "react-router-dom";
import { IonIcon } from "@ionic/react";
import {
    logoYoutube,logoInstagram,logoPinterest,logoX,logoFacebook,logoTiktok,locationOutline
} from "ionicons/icons";
import Visa from "../../../../../src/assets/securePayments/visa.png";
import Mastercard from "../../../../../src/assets/securePayments/master-card.png";
import Discover from "../../../../../src/assets/securePayments/discover.png";
import Mpesa from "../../../../../src/assets/securePayments/mpesa.png";
import Paypal from "../../../../../src/assets/securePayments/paypal.png";
import DHL from "../../../../../src/assets/partnaship/DHL.png";
import FedEx from "../../../../../src/assets/partnaship/fedex.png";
import WellsFargo from "../../../../../src/assets/partnaship/wellfargo.jpeg";

const Footer = () => {
    return(
        <footer>
        <div className="px-4 py-24 md:px-8 lg:px-6 xl:px-64 bg-gray-100 text-sm mt-24 xxs:block">
            {/* top */}
            <div className="flex justify-between gap-24 md:flex-row xxs:flex-col">
                {/* left */}
                <div className="flex flex-col gap-8 w-full md:w-auto lg:w-1/4 ">
                <Link to="/"><div className="text-2xl tracking-wide">
                    MaaMaraMarket</div></Link>
                <p>
                <IonIcon className="text-md mr-2" icon={locationOutline}/>14354 RedHill Road Kitisuru, Westlands, Nairobi 0100, KE, East Africa</p>
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
                    <Link to="#">Account</Link>
                    <Link to="#">Contact us</Link>
                    <Link to="#">Order History</Link>
                    <Link to="#">Shipping</Link>
                    <Link to="#">Support</Link>
                    <Link to="#">Help</Link>
                    <Link to="#">Returns</Link>
                    <Link to="#">Career</Link>
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
                    <Link to="vendor-register-form">Sell</Link>
                    <Link to="#">My Account</Link>
                    <Link to="#">Legal & Privacy</Link>
                    <Link to="#">Buy Gift Cards</Link>

                    <h1 className="font-semibold text-lg mt-6">DASHBOARD</h1>
                    <a href="login">Dashboards</a>
                </div>
                </div>

                {/* right */}
                <div className="flex flex-col gap-8 w-full md:w-auto lg:w-1/4">
                <h1 className="font-medium text-lg">SUBSCRIBE</h1>
                <p>Get our latest news and shop deals about trends, promotions, and much more!</p>
                <div className="flex">
                    <input type="text"
                     placeholder="Email Address" 
                     className="p-4 w-3/4 "
                     name="email"
                     id="email"
                     autoComplete="true"
                     />
                     <button className="w-1/4 primary-button text-white">Join</button>
                     </div>
                     <span className="font-semibold">Secure Payments</span>
                     <div className="flex justify-between">
                     <img className="w-20 h-10" src={Visa} alt="Visa" />
                     <img className="w-20 h-10" src={Mastercard} alt="master-card" />
                     <img className="w-20 h-10" src={Discover} alt="discover" />
                     <img className="w-20 h-10" src={Mpesa} alt="mpesa" />
                     <img className="w-20 h-10" src={Paypal} alt="mpesa" />
                        
                     
                </div>

                <span className="font-semibold">Partnership</span>
                     <div className="flex justify-between">
                     <img className="w-20 h-10" src={DHL} alt="Visa" />
                     <img className="w-20 h-10" src={FedEx} alt="Visa" />
                     <img className="w-20 h-10" src={WellsFargo} alt="Visa" />
                        
                     
                </div>
                </div>

            </div>
            {/* Bottom */}
        <div className="border-t border-gray-300 mt-16 pt-6 flex flex-col md:flex-row justify-between items-center text-gray-600 text-sm gap-4">
          <span>© 2025 MaaMaraMarket. All rights reserved.</span>

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
        </footer>
    )
};

export default Footer;