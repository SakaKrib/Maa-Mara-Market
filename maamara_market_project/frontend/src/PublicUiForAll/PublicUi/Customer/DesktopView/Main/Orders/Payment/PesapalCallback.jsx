import React, { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const PesapalCallback = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const status = params.get("status");
    const orderId = params.get("order_id");

    const timer = window.setTimeout(() => {
      if (status === "success" && orderId) {
        navigate(`/customer-order/track/${orderId}`, { replace: true });
      } else {
        navigate("/customer-order", { replace: true });
      }
    }, 1200);

    return () => window.clearTimeout(timer);
  }, [location.search, navigate]);

  const params = new URLSearchParams(location.search);
  const success = params.get("status") === "success";

  return (
    <main className="mm-page flex min-h-[60vh] items-center justify-center px-4 py-10">
      <section className="mm-card w-full max-w-md p-6 text-center">
        <h1 className="text-xl font-semibold text-card-foreground">
          {success ? "Payment received" : "Payment status is being confirmed"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {success
            ? "Your order is now being prepared. Redirecting to your order..."
            : "We are confirming your Pesapal payment. Redirecting to your orders..."}
        </p>
      </section>
    </main>
  );
};

export default PesapalCallback;
