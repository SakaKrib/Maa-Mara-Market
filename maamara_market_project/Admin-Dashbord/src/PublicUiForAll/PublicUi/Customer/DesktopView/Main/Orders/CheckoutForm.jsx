import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../../../../../../components/ui/input";
import { Button } from "../../../../../../../components/ui/button";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { useCartContext } from "../CartHook/cart";
import { getData } from "country-list";
import PhoneInput from "react-phone-input-2";
import { useNavigate } from "react-router-dom";
import api from "../../../../../../../Services/Api";
import "react-phone-input-2/lib/style.css";

// Zod validation schema
const checkoutSchema = z.object({
  email: z.string().email("Enter a valid email"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  address: z.string().min(1, "Address is required"),
  apartment: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zip: z.string().min(1, "ZIP Code is required"),
  country: z.string().min(1, "Country is required"),
  phone: z.string().min(1, "Phone number is required"),
  payment: z.enum(["Mpesa", "PayPal"], {
    errorMap: () => ({ message: "Select a payment method" }),
  }),
  shippingMethod: z.string().optional(),
});

export default function CheckoutPage() {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(checkoutSchema),
  });

  const { order } = useCartContext(); // may be null
  const [buyNowItem, setBuyNowItem] = useState(null);
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const countries = getData();
  const navigate = useNavigate();
  const [totalOrder, setTotalOrder] = useState(0);
  const [snackbar, setSnackbar] = useState({ open: false, message: "", severity: "info" });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({ open: true, message, severity });
  };

  const shippingCost = selectedShipping ? Number(selectedShipping.price_kes ?? selectedShipping.price ?? 0) : 0;

  // Protected checkout/shipping endpoints accept either a logged-in user or a
  // server-issued visitor identity. Ensure a guest has that identity before
  // making either request. Authenticated users are left unchanged by this API.
  const ensureCheckoutIdentity = async () => {
    await api.get("/api/vistor-token/");
  };

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("maaMaraBuyNow");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.itemId) setBuyNowItem(parsed);
      }
    } catch (error) {
      console.error("Unable to restore Buy Now selection:", error);
    }
  }, []);
  const checkoutItems = buyNowItem ? [{
    id: buyNowItem.itemId,
    name: buyNowItem.itemName,
    quantity: buyNowItem.quantity,
    final_price: buyNowItem.unitPrice,
    price: buyNowItem.unitPrice,
    variant_id: buyNowItem.variantId,
    variant_color: buyNowItem.color,
    size_id: buyNowItem.sizeId,
    size: buyNowItem.size,
    age_variant_id: buyNowItem.ageVariantId,
    age_group: buyNowItem.ageGroup,
    shoe_id: buyNowItem.shoeId,
    shoe_size: buyNowItem.selectedShoeSize,
    selected_weight: buyNowItem.weight,
    selected_length: buyNowItem.length,
    custom_preferences: buyNowItem.customPreferences,
  }] : (order?.items || []);

  

  // Validation feedback is handled through the shared Snackbar pattern,
  // rather than native browser alert dialogs.
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0]?.message;
      if (firstError) showSnackbar(firstError, "error");
    }
  }, [errors]);

  useEffect(() => {
    if (checkoutItems.length > 0) {
      const subtotal = checkoutItems.reduce((acc, item) => {
        const price = Number(item.final_price || item.price || 0);
        const quantity = Number(item.quantity || 1);
        return acc + price * quantity;
      }, 0);
      setTotalOrder(subtotal);
    } else {
      setTotalOrder(0);
    }
  }, [checkoutItems.length, buyNowItem, order?.items]);
  

  // shipping rstes

const fetchShippingQuote = async () => {
  const addressData = watch(); // get current form values

  if (!addressData.country || !addressData.city || !addressData.zip) {
    showSnackbar("Please fill country, city, and ZIP code to get a shipping quote", "warning");
    return;
  }

  try {
    await ensureCheckoutIdentity();

    const payload = {
      order_id: order?.order?.id || null,
      address: addressData.address,
      apartment: addressData.apartment || "",
      city: addressData.city,
      state: addressData.state || "",
      zip: addressData.zip,
      country: addressData.country,
      phone: addressData.phone,
      items: checkoutItems.map(item => ({
        id: item.id,
        quantity: item.quantity,
        weight: item.weight || 0.5,
        length: item.length || 5,
        width: item.width || 5,
        height: item.height || 5,
      })),
    };

    const res = await fetch("/api/shipping-rates", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error("Failed to get shipping rates");
    const data = await res.json();
    setShippingOptions(data.rates || []);
    if (data.rates?.length) {
      showSnackbar("Shipping quote fetched successfully.", "success");
    } else {
      showSnackbar("Shipping quotes are temporarily unavailable while DHL/FedEx integration is muted.", "info");
    }
  } catch (err) {
    console.error("Error fetching shipping quote:", err);
    showSnackbar("Failed to get shipping quote. Try again.", "error");
  }
};
  
  

  const onSubmit = async (data) => {
    const payload = {
      first_name: data.firstName || "",
      last_name: data.lastName || "",
      phone: data.phone || "",
      email: data.email || "",
      street_address: data.address || "",
      appartment_address: data.apartment || "",
      city: data.city || "",
      state: data.state || "",
      country: data.country || "",
      zip: data.zip || "",
      payment_method: data.payment || "",
      shipping: selectedShipping || "",
      items: checkoutItems.map((item) => ({
        id: item?.id ?? null,
        quantity: item?.quantity ?? 1,
        variant_id: item?.variant_id ?? null,
        size_id: item?.size_id ?? null,
        age_variant_id: item?.age_variant_id ?? null,
        length_id: item?.length_id ?? null,
        weight_id: item?.weight_id ?? null,
        shoe_id: item?.shoe_id ?? null,
        selected_shoe_size: item?.shoe_size ?? null,
        custom_preferences: item?.custom_preferences ?? {},
      })),
    };

    try {
      await ensureCheckoutIdentity();
      const responseData = res.data;

      console.log("✅ Checkout successful:", responseData);

      if (!res.ok) throw new Error("Checkout failed");
      const responseData = await res.json();

      console.log("✅ Checkout successful:", responseData);

      if (buyNowItem) sessionStorage.removeItem("maaMaraBuyNow");

      // call the shipping api
      // fetchShippingQuote();

      // Route based on payment method
      const method = (responseData.payment.payment_method || "").toLowerCase();
      if (method === "paypal") {
        navigate("/paypal-make-payment", { state: responseData });
      } else if (method === "mpesa") {
        navigate("/mpesa-make-payment", { state: responseData });
      } else {
        navigate("/order-confirmation", { state: responseData });
      }
    } catch (error) {
      console.error("❌ Checkout error:", error);
      showSnackbar("Checkout failed. Please try again.", "error");
    }
  };



  

  return (
    <>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnackbar((current) => ({ ...current, open: false }))}
          severity={snackbar.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
      <main className="mm-page min-h-screen py-6 md:py-10">
      <div className="mm-container">
        <div className="mb-6 border-b border-border pb-4">
          <h1 className="text-2xl md:text-3xl font-bold">Checkout</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Complete your delivery details and choose your payment method.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] items-start">
          <section className="mm-card p-5 sm:p-6 md:p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-7">
              <div>
                <h2 className="text-lg font-semibold">Contact information</h2>
                <p className="mt-1 text-sm text-muted-foreground">How we can reach you about this order.</p>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Input placeholder="First name" {...register("firstName")} />
                    {errors.firstName && <p className="mt-1 text-sm text-red-500">{errors.firstName.message}</p>}
                  </div>
                  <div>
                    <Input placeholder="Last name" {...register("lastName")} />
                    {errors.lastName && <p className="mt-1 text-sm text-red-500">{errors.lastName.message}</p>}
                  </div>
                </div>

                <div className="mt-4">
                  <Input type="email" placeholder="Email address" {...register("email")} />
                  {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>}
                </div>

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <div className="mt-4">
                      <PhoneInput
                        country={"us"}
                        value={field.value}
                        onChange={field.onChange}
                        enableSearch
                        inputClass="!w-full !h-10 !rounded-md !border-gray-200"
                        containerClass="!w-full"
                      />
                      {errors.phone && <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>}
                    </div>
                  )}
                />
              </div>

              <div className="border-t border-border pt-7">
                <h2 className="text-lg font-semibold">Shipping address</h2>
                <p className="mt-1 text-sm text-muted-foreground">Where should we deliver your order?</p>

                <div className="mt-4 space-y-4">
                  <div>
                    <Input placeholder="Street address" {...register("address")} />
                    {errors.address && <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>}
                  </div>

                  <Input placeholder="Apartment, suite, etc. (optional)" {...register("apartment")} />

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div>
                      <Input placeholder="City" {...register("city")} />
                      {errors.city && <p className="mt-1 text-sm text-red-500">{errors.city.message}</p>}
                    </div>
                    <div>
                      <Input placeholder="State" {...register("state")} />
                      {errors.state && <p className="mt-1 text-sm text-red-500">{errors.state.message}</p>}
                    </div>
                    <div>
                      <Input placeholder="ZIP Code" {...register("zip")} />
                      {errors.zip && <p className="mt-1 text-sm text-red-500">{errors.zip.message}</p>}
                    </div>
                  </div>

                  <div>
                    <label htmlFor="country" className="mb-1.5 block text-sm font-medium">Country</label>
                    <select
                      id="country"
                      {...register("country")}
                      className="w-full rounded-full border border-gray-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-gray-400"
                    >
                      <option value="">Select country</option>
                      {countries.map((country, idx) => (
                        <option key={idx} value={country.code}>{country.name}</option>
                      ))}
                    </select>
                    {errors.country && <p className="mt-1 text-sm text-red-500">{errors.country.message}</p>}
                  </div>
                </div>
              </div>

              <div className="border-t border-border pt-7">
                <h2 className="text-lg font-semibold">Delivery</h2>
                <p className="mt-1 text-sm text-muted-foreground">Get an available shipping quote for this address.</p>

                <Button type="button" onClick={fetchShippingQuote} className="primary-button mm-button-fit mt-4 rounded-full px-5 text-white font-semibold">
                  Get shipping quote
                </Button>

                {shippingOptions.length > 0 && (
                  <div className="mt-5 space-y-3">
                    {shippingOptions.map((option, idx) => (
                      <label
                        key={idx}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-border bg-white px-4 py-3 text-sm transition hover:bg-muted/30"
                      >
                        <span className="flex items-center gap-3">
                          <input
                            type="radio"
                            value={option.service}
                            {...register("shippingMethod")}
                            onChange={() => setSelectedShipping(option)}
                            className="h-4 w-4"
                          />
                          <span className="font-medium">{option.service}</span>
                        </span>
                        <span className="font-semibold">
                          KES {Number(option.price_kes ?? option.price ?? 0).toLocaleString()}
                        </span>
                      </label>
                    ))}
                    {errors.shippingMethod && <p className="text-sm text-red-500">{errors.shippingMethod.message}</p>}
                  </div>
                )}
              </div>

              <div className="border-t border-border pt-7">
                <h2 className="text-lg font-semibold">Payment method</h2>
                <p className="mt-1 text-sm text-muted-foreground">Choose how you would like to pay.</p>

                <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {["Mpesa", "PayPal"].map((method) => (
                    <label
                      key={method}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-white px-4 py-3 text-sm font-medium transition hover:bg-muted/30"
                    >
                      <input type="radio" value={method} {...register("payment")} className="h-4 w-4" />
                      {method}
                    </label>
                  ))}
                </div>
                {errors.payment && <p className="mt-1 text-sm text-red-500">{errors.payment.message}</p>}
              </div>

              <div className="border-t border-border pt-7">
                <Button type="submit" className="primary-button mm-button-full rounded-full px-5 py-3 text-white font-semibold">
                  Complete order
                </Button>
              </div>
            </form>
          </section>

          <aside className="mm-card p-5 sm:p-6 lg:sticky lg:top-6">
            <div className="border-b border-border pb-4">
              <h2 className="text-lg font-bold">Order summary</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {checkoutItems.length} {checkoutItems.length === 1 ? "item" : "items"}
              </p>
            </div>

            <div className="space-y-4 py-5">
              {checkoutItems.length > 0 ? (
                checkoutItems.map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.name}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Qty: {item.quantity}</p>
                      {item.variant_color && <p className="text-xs text-muted-foreground">Color: {item.variant_color}</p>}
                      {item.size !== null && item.size !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Size: {typeof item.size === "object" ? JSON.stringify(item.size) : item.size}
                        </p>
                      )}
                      {item.age_group && <p className="text-xs text-muted-foreground">Age: {item.age_group}</p>}
                      {item.shoe_size && <p className="text-xs text-muted-foreground">Shoe size: {item.shoe_size}</p>}
                      {item.selected_weight && (
                        <p className="text-xs text-muted-foreground">
                          Weight: {typeof item.selected_weight === "object" ? JSON.stringify(item.selected_weight) : item.selected_weight}
                        </p>
                      )}
                      {item.selected_length && (
                        <p className="text-xs text-muted-foreground">
                          Length: {typeof item.selected_length === "object" ? JSON.stringify(item.selected_length) : item.selected_length}
                        </p>
                      )}
                      {item.custom_preferences && (
                        <p className="mt-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs leading-5 text-muted-foreground">
                          <span className="font-semibold text-card-foreground">Custom request:</span>{" "}
                          {typeof item.custom_preferences === "object"
                            ? JSON.stringify(item.custom_preferences)
                            : item.custom_preferences}
                        </p>
                      )}
                    </div>
                    <span className="shrink-0 text-sm font-semibold">
                      KES {((Number(item.final_price || item.price || 0)) * Number(item.quantity || 1)).toLocaleString()}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Your cart is empty.</p>
              )}
            </div>

            <div className="mm-divider" />

            <div className="space-y-3 pt-4 text-sm">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span className="font-semibold">KES {Number(totalOrder).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>Shipping</span>
                <span className="font-semibold">
                  {shippingOptions.length === 0
                    ? "--"
                    : selectedShipping
                    ? `KES ${Number(selectedShipping.price_kes ?? selectedShipping.price ?? 0).toLocaleString()}`
                    : "Select shipping"}
                </span>
              </div>
            </div>

            <div className="mm-divider" />

            <div className="flex items-baseline justify-between">
              <span className="font-semibold">Total</span>
              <strong className="text-xl">KES {Number(totalOrder + shippingCost).toLocaleString()}</strong>
            </div>
          </aside>
        </div>
      </div>
    </main>
    </>
  );
}
