import React, { useState, useEffect } from "react";
import VendorForm from "./VendorRegistrationForm";
import { Button } from "../../../../components/ui/button";
import { useCustomerAccessGuard } from "../../Hooks/AccessCRF/CustomerAccess";
import { useAuth } from "../../Auth/AuthContext/Context";
import HeaderPages from "../../OtherPageHeader";

const VendorRegistration = () => {

  const isAllowed = useCustomerAccessGuard();

  const { user } = useAuth();

  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);


  if (!isAllowed) return null;


  const storageKey =
    user && user.id
      ? `agreedToTerms_${user.id}`
      : "agreedToTerms";


  useEffect(() => {

    const agreedBefore =
      localStorage.getItem(storageKey);


    if (agreedBefore === "true") {
      setShowForm(true);
    }

  }, [storageKey]);



  const handleAgreementSubmit = (e) => {

    e.preventDefault();


    if (agreed) {

      setError("");

      localStorage.setItem(
        storageKey,
        "true"
      );

      setShowForm(true);

    } else {

      setError(
        "Please confirm that you have read and agreed to the Vendor Terms and Conditions."
      );

    }

  };



  if (showForm) {
    return <VendorForm />;
  }



  return (
    <div className="w-full max-w-5xl mx-auto px-4 xxs:p-1  sm:px-6 md:px-8 py-8">

      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-2xl shadow-xl overflow-hidden">


        {/* Header */}
        <HeaderPages/>

        <div className="p-6 lg:mt-20 lg:py-10 xxs:mt-20 xxs:py-10  md:p-8 border-b dark:border-slate-700">

          <h1 className="text-2xl md:text-4xl font-bold tracking-tight">
            Maamara Market Vendor Terms & Conditions
          </h1>


          <p className="mt-4 text-gray-600 md:text-lg lg:text-lg dark:text-gray-300 xxs:text-sm leading-relaxed">
            Welcome to Maamara Market. We are committed to building a trusted
            marketplace that connects customers with authentic handmade,
            locally produced, and unique products.
            <br /><br />
            Before becoming a vendor, please carefully review and accept the
            following terms and conditions. These requirements help us maintain
            quality, trust, and a reliable shopping experience for our customers.
          </p>

        </div>



        {/* Terms */}

        <div
          className="
            p-6 md:p-8
            space-y-8
            max-h-[60vh]
            overflow-y-auto
          "
        >


          {[
            {
              title: "1. Vendor Eligibility",
              points: [
                "Vendors must sell handmade products created by them, owned by them, or legally authorized for sale.",
                "Maamara Market welcomes businesses of all sizes provided they meet our marketplace standards.",
                "False, misleading, counterfeit, or unauthorized products are strictly prohibited."
              ]
            },

            {
              title: "2. Vendor Information Requirements",
              points: [
                "Vendors must provide accurate personal, business, contact, and payment information.",
                "A valid phone number and email address must be provided for communication regarding orders, sales, and account matters.",
                "All information submitted must remain updated and correct."
              ]
            },

            {
              title: "3. Workshop Requirement",
              points: [
                "Every vendor must have a workshop, production area, or verified location where products are created or managed.",
                "Vendors must maintain consistency in product quality and availability."
              ]
            },

            {
              title: "4. Product Approval Requirements",
              points: [
                "Vendors must submit a minimum of five products before approval.",
                "Each product must include accurate descriptions, images, pricing, stock information, and specifications."
              ]
            },

            {
              title: "5. Organic Products and Certification",
              points: [
                "Vendors selling organic or regulated products must provide required certifications.",
                "Where applicable, KEBS certification will be required before approval."
              ]
            },

            {
              title: "6. Product Accuracy and Quality",
              points: [
                "Products delivered must match the description, images, and specifications displayed on the platform.",
                "Vendors are responsible for ensuring products meet customer expectations."
              ]
            },

            {
              title: "7. Order Processing and Dispatch",
              points: [
                "Vendors must prepare customer orders within the required timeframe.",
                "Items must be delivered to the Maamara Market dispatch center on time.",
                "The vendor must verify that the correct item is sent."
              ]
            },

            {
              title: "8. Customer Confirmation and Payments",
              points: [
                "Vendor payments are processed after the customer receives and confirms the order.",
                "Vendors must allow the verification process to be completed before requesting payment updates.",
                "Unnecessary calls or messages regarding pending payments should be avoided."
              ]
            },

            {
              title: "9. Returns and Refunds",
              points: [
                "Vendors must be willing to accept valid customer returns according to Maamara Market policies.",
                "Returns may apply when products are incorrect, damaged, defective, or different from the listing.",
                "Vendors must cooperate with replacement, return, or refund processes."
              ]
            },

            {
              title: "10. Payment Methods and Vendor Charges",
              points: [
                "Vendors must provide their preferred payment method during registration.",
                "Registration and product listing are completely free.",
                "A marketplace charge consisting of 30% markup plus 15% platform service charges applies when sales are completed."
              ]
            },

            {
              title: "11. Vendor Portal Access",
              points: [
                "Approved vendors receive credentials to access the Vendor Portal.",
                "Vendors can manage products, create blogs, submit banners, and update their marketplace information."
              ]
            },

            {
              title: "12. Content Approval",
              points: [
                "All products, blogs, banners, and promotional content must be approved by the Maamara Market team before publication."
              ]
            },

            {
              title: "13. Account Responsibility",
              points: [
                "Vendors are responsible for protecting their account credentials.",
                "Violation of marketplace policies may result in suspension or removal."
              ]
            }
          ].map((section, index) => (

            <section key={index}>

              <h2 className="text-lg md:text-xl font-semibold mb-3">
                {section.title}
              </h2>

              <ul className="list-disc pl-5 space-y-2 text-sm md:text-base text-gray-700 dark:text-gray-300">

                {section.points.map((point, i) => (
                  <li key={i}>
                    {point}
                  </li>
                ))}

              </ul>

            </section>

          ))}



          <p className="italic text-sm md:text-base text-gray-600 dark:text-gray-400">
            By continuing, you confirm that you have read, understood, and agreed
            to follow the Maamara Market Vendor Terms and Conditions.
          </p>


        </div>



        {/* Agreement */}

        <div className="border-t dark:border-slate-700 p-6 md:p-8">


          <form onSubmit={handleAgreementSubmit}>


            <label className="flex items-start gap-3 text-sm md:text-base cursor-pointer">

              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) =>
                  setAgreed(e.target.checked)
                }
                className="mt-1 h-4 w-4"
              />


              <span className="xxs:text-xs">
                I confirm that I have read, understood, and agree to the Maamara
                Market Vendor Terms and Conditions.
              </span>

            </label>



            {error && (
              <p className="text-red-600 mt-3 text-sm">
                {error}
              </p>
            )}



            <div className="flex w-full justify-center">
                <Button
                  type="submit"
                  className="
                    mt-6
                    w-full sm:w-auto
                    min-h-[48px]
                    px-8
                    primary-button
                  "
                >
                  Continue to Vendor Registration
                </Button>

            </div>

          </form>


        </div>


      </div>

    </div>
  );
};


export default VendorRegistration;