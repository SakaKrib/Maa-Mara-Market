import React, { useState, useEffect } from "react"
import VendorForm from "./VendorRegistrationForm" // the full form logic from earlier
import { Button } from "../../../../components/ui/button";
import { useCustomerAccessGuard } from "../../Hooks/AccessCRF/CustomerAccess";
import { useAuth } from "../../Auth/AuthContext/Context";

const VendorRegistration = () => {
  
  const isAllowed = useCustomerAccessGuard();
  if (!isAllowed) return null;

  const [agreed, setAgreed] = useState(false)
  const [error, setError] = useState("")
  const {user} = useAuth();

  console.log("User object from useAuth:", user);


  // create a unique localStorage key per user (optional but better)
  const storageKey = user && user.id ? `agreedToTerms_${user.id}` : "agreedToTerms";


    // store in the local storage
    useEffect(() => {
      console.log("Using localStorage key:", storageKey);
      const agreedBefore = localStorage.getItem(storageKey);
      console.log("agreedBefore value:", agreedBefore);
      if (agreedBefore === "true") setShowForm(true);
    }, [storageKey]);
    
    
    const handleAgreementSubmit = (e) => {
      e.preventDefault();
      if (agreed) {
        setError("");
        localStorage.setItem(storageKey, "true");
        setShowForm(true);
      } else {
        setError("Please confirm that you have read and agreed to the terms and conditions.");
      }
    };

  const [showForm, setShowForm] = useState(false)

  if (showForm) return <VendorForm />


  
 

  return (
    <div className="vendor-terms max-w-3xl mx-auto p-6 border rounded-lg shadow relative bottom-10 top-10">
      <h1 className="text-2xl font-bold mb-4 ">🌟 Vendor Terms & Conditions</h1>
      <p className="mb-4">
        Welcome to a community of creators, growers, and passionate sellers! Before joining our platform as a vendor,
        please review and accept the following terms to proceed with your application.
      </p>

      {/* Repeat the T&Cs here or import it from a separate component */}
      <div className="space-y-6 text-sm leading-relaxed max-h-[60vh] overflow-y-auto pr-4">
        <section>
          <h2 className="font-semibold text-xl">1. Personal Information</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Provide your <strong>original full name</strong>.</li>
            <li>Enter a <strong>valid phone number</strong>.</li>
            <li>Submit an <strong>active email address</strong>.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">2. Product Pricing & Margin</h2>
          <ul className="list-disc pl-5">
            <li>Wholesale pricing only.</li>
            <li>We add a <strong>37% markup</strong>.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">3. Vendor Reliability</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Consistent supply is expected.</li>
            <li>Returns and refunds are required where applicable.</li>
            <li>Inactivity will result in removal.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">4. Vendor Verification</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Photo of your workshop.</li>
            <li>Sample products and pricing must be included.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">5. Product Categories</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Handmade or Organic only.</li>
            <li>Organic vendors must be certified.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">6. Payment Terms</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Monthly payouts.</li>
            <li>Returned items will be deducted.</li>
            <li>Choose one payment method: M-Pesa, PayPal, etc.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">7. Sales Tracking</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Daily sales reports available.</li>
            <li>Inactivity removes vendor rights.</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-xl">8. Promotions</h2>
          <ul className="list-disc pl-5 text-sm">
            <li>Optional: pay for premium front-page exposure.</li>
          </ul>
        </section>

        <p className="mt-4 italic">✨ By continuing, you agree to the above terms and conditions.</p>
      </div>

      <form onSubmit={handleAgreementSubmit} className="mt-6">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            className="mt-1"
          />
          <span>I confirm that I have read and agree to the Vendor Terms & Conditions.</span>
        </label>
        {error && <p className="text-red-600 mt-2">{error}</p>}

        <Button type="submit" className="mt-4">
          Proceed to Vendor Registration
        </Button>
      </form>
    </div>
  )
};

export default VendorRegistration;
