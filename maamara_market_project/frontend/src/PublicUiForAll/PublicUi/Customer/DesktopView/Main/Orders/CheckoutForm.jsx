import React, { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "../../../../../../../components/ui/button";
import { useCartContext } from "../CartHook/cart";
import { getData } from "country-list";
import { useNavigate } from "react-router-dom";
import CheckoutContactForm from "./Checkout/CheckoutContactForm";
import ShippingOptions from "./Checkout/ShippingOptions";
import PaymentMethod from "./Checkout/PaymentMethod";
import OrderSummary from "./Checkout/OrderSummary";
import { checkoutSchema, defaultCheckoutValues } from "./Checkout/checkoutSchema";
import { fetchShippingRates, submitCheckout } from "./Checkout/checkoutApi";
import CheckoutPaypalPayment from "./Payment/Paypal";
import "react-phone-input-2/lib/style.css";

export default function CheckoutPage() {
  const { register, handleSubmit, control, watch, formState: { errors } } = useForm({
    resolver: zodResolver(checkoutSchema),
    defaultValues: defaultCheckoutValues,
  });
  const { order } = useCartContext();
  const navigate = useNavigate();
  const countries = useMemo(() => getData(), []);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState("");

  const subtotal = useMemo(() =>
    (order?.items || []).reduce((sum, item) =>
      sum + Number(item?.final_price ?? item?.price ?? 0) * Number(item?.quantity || 1), 0
    ), [order]);
  const shippingCost = Number(selectedShipping?.rate ?? selectedShipping?.price ?? 0);
  const total = subtotal + shippingCost;

  useEffect(() => {
    const firstError = Object.values(errors)[0]?.message;
    if (firstError) setShippingError("");
  }, [errors]);

  const getShippingQuote = async () => {
    setShippingError("");
    const address = watch();
    if (!address.country || !address.city || !address.zip) {
      setShippingError("Please fill in country, city, and ZIP / postal code first.");
      return;
    }
    setIsLoadingShipping(true);
    try {
      const rates = await fetchShippingRates({ order, address });
      setShippingOptions(rates);
      setSelectedShipping(null);
      if (!rates.length) setShippingError("No shipping rates are available for this address.");
    } catch {
      setShippingError("We could not get shipping rates. Please try again.");
    } finally {
      setIsLoadingShipping(false);
    }
  };

  const onSubmit = async (data) => {
    try {
      const responseData = await submitCheckout(data, order, selectedShipping);
      const method = String(responseData?.payment?.payment_method || "").toLowerCase();
      if (method === "paypal") navigate("/paypal-make-payment", { state: { order: { order: responseData } } });
      else if (method === "mpesa") navigate("/mpesa-make-payment", { state: { order: { order: responseData } } });
      else navigate("/order-confirmation", { state: { order: { order: responseData } } });
    } catch {
      setShippingError("Checkout failed. Please review your details and try again.");
    }
  };

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center justify-between border-b border-gray-300 logo">
        <a href="/" className="flex items-center space-x-2 text-2xl font-bold text-gray-800" aria-label="Maa Mara Market home">
          <span className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">MMM</span>
          <span>Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span></span>
        </a>
        <a href="/" className="font-semibold hover:underline">Go to Shop</a>
      </header>

      <main className="bg-muted flex flex-col items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8">
          <section className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
            <h1 className="text-2xl font-semibold mb-6">Checkout</h1>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <CheckoutContactForm register={register} control={control} errors={errors} countries={countries} />

              <ShippingOptions
                options={shippingOptions}
                selectedShipping={selectedShipping}
                onSelect={setSelectedShipping}
                error={shippingError ? { message: shippingError } : null}
              />

              <PaymentMethod register={register} error={errors.payment} />

              <div className="flex flex-col gap-3">
                <Button type="button" onClick={getShippingQuote} disabled={isLoadingShipping}>
                  {isLoadingShipping ? "Getting rates…" : "Get Shipping Quote"}
                </Button>
                <Button type="submit" className="w-full">Complete Order</Button>
              </div>
            </form>
          </section>

          <OrderSummary order={order} subtotal={subtotal} shippingCost={shippingCost} />

          <div className="hidden">
            <CheckoutPaypalPayment order={order} />
          </div>
        </div>
      </main>
    </div>
  );
}
