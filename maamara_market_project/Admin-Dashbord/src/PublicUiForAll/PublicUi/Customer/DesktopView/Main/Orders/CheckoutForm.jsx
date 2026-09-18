import React, { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../../../../../../../components/ui/input";
import { Button } from "../../../../../../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../../../../../../components/ui/card";
import { useCartContext } from "../CartHook/cart";
import { getData } from "country-list";
import PhoneInput from "react-phone-input-2";
import { useNavigate } from "react-router-dom";
import "react-phone-input-2/lib/style.css";
import CheckoutPaypalPayment from "./Payment/Paypal";

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
  payment: z.enum(["Mpesa", "Credit Card", "PayPal"], {
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
  const [shippingOptions, setShippingOptions] = useState([]);
  const [selectedShipping, setSelectedShipping] = useState(null);
  const countries = getData();
  const navigate = useNavigate();
  const [totalOrder, setTotalOrder] = useState(0);

  const shippingCost = selectedShipping ? Number(selectedShipping.rate) : 0;

  console.log("this is order", countries)


  // Watch errors and show first error as alert (replace with toast if needed)
  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      const firstError = Object.values(errors)[0]?.message;
      if (firstError) alert(firstError);
    }
  }, [errors]);

  useEffect(() => {
    if (order?.items?.length > 0) {
      const subtotal = order.items.reduce((acc, item) => {
        const price = Number(item.final_price || item.price || 0);
        const quantity = Number(item.quantity || 1);
        return acc + price * quantity;
      }, 0);
      setTotalOrder(subtotal);
    } else {
      setTotalOrder(0);
    }
  }, [order]);
  

  // shipping rstes

const fetchShippingQuote = async () => {
  const addressData = watch(); // get current form values

  if (!addressData.country || !addressData.city || !addressData.zip) {
    alert("Please fill country, city, and ZIP code to get a shipping quote");
    return;
  }

  try {
    const payload = {
      order_id: order.order.id,
      address: addressData.address,
      apartment: addressData.apartment || "",
      city: addressData.city,
      state: addressData.state || "",
      zip: addressData.zip,
      country: addressData.country,
      phone: addressData.phone,
      items: order.items.map(item => ({
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
    alert("✅ Shipping quote fetched successfully!");
  } catch (err) {
    console.error("Error fetching shipping quote:", err);
    alert("Failed to get shipping quote. Try again.");
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
      items:
        order?.items?.map((item) => ({
          id: item?.id ?? null,
          quantity: item?.quantity ?? 1,
          variant_id: item?.variant_id ?? null,
          size_id: item?.size_id ?? null,
          age_variant_id: item?.age_variant_id ?? null,
          length_id: item?.length_id ?? null,
          weight_id: item?.weight_id ?? null,
          shoe_id: item?.shoe_id ?? null,
          selected_shoe_size: item?.shoe_size ?? null,
        })) || [],
    };

    try {
      const res = await fetch("/api/checkout/", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Checkout failed");
      const responseData = await res.json();

      console.log("✅ Checkout successful:", responseData);

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
      alert("Checkout failed. Please try again.");
    }
  };



  

  return (
    <div className="flex flex-col w-full min-h-screen bg-gray-50">
      {/* Header / Logo */}
      <div className="bg-white shadow-sm p-4 flex items-center justify-between border-b border-gray-300 logo fixed w-full">
        <a href="#" className="flex items-center space-x-2 text-2xl font-bold text-gray-800">
          <span className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
            MMM
          </span>
          <span>
            Maa <span className="it-name">Mara</span> <span className="mkrt">Market</span>
          </span>
        </a>
        <span className="font-semibold hover:underline cursor-pointer">Go to Shop</span>
      </div>
    <div className="bg-muted flex flex-col items-center justify-center p-6 md:p-10">
     

      <div className="min-h-screen mt-10 flex justify-center items-start py-10">
        <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 px-4">
          {/* Left Section - Form */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-md">
            <h2 className="text-2xl font-semibold mb-6">Checkout</h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {/* Contact Info */}
              <div>
                <h3 className="text-lg font-medium mb-3">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input placeholder="First name" {...register("firstName")} />
                  {errors.firstName && <p className="text-red-500 text-sm">{errors.firstName.message}</p>}

                  <Input placeholder="Last name" {...register("lastName")} />
                  {errors.lastName && <p className="text-red-500 text-sm">{errors.lastName.message}</p>}
                </div>

                <Input type="email" placeholder="Email address" {...register("email")} className="mt-3"/>
                {errors.email && <p className="text-red-500 text-sm">{errors.email.message}</p>}

                <Controller
                  name="phone"
                  control={control}
                  render={({ field }) => (
                    <div className="mt-3">
                      <PhoneInput
                        country={"us"}
                        value={field.value}
                        onChange={field.onChange}
                        enableSearch
                        inputClass="!w-full"
                        containerClass="!w-full"
                      />
                      {errors.phone && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                    </div>
                  )}
                />
              </div>

              {/* Shipping Address */}
              <div>
                <h3 className="text-lg font-medium mb-3">Shipping Address</h3>
                <Input placeholder="Street address" className="mt-3" {...register("address")} />
                {errors.address && <p className="text-red-500 text-sm">{errors.address.message}</p>}

                <Input placeholder="Apartment, suite, etc. (optional)" className="mt-3" {...register("apartment")} />

                <div className="grid grid-cols-3 gap-4 mt-3">
                  <Input placeholder="City" {...register("city")} />
                  {errors.city && <p className="text-red-500 text-sm">{errors.city.message}</p>}

                  <Input placeholder="State" {...register("state")} />
                  {errors.state && <p className="text-red-500 text-sm">{errors.state.message}</p>}

                  <Input placeholder="ZIP Code" {...register("zip")} />
                  {errors.zip && <p className="text-red-500 text-sm">{errors.zip.message}</p>}
                </div>

                <div className="mt-3">
                  <label htmlFor="country" className="block mb-1 text-sm font-medium">
                    Country
                  </label>
                  <select
                    id="country"
                    {...register("country")}
                    className="w-full border rounded p-2"
                  >
                    <option value="">Select country</option>
                    {countries.map((country, idx) => (
                      <option key={idx} value={country.code}>
                        {country.name}
                      </option>
                    ))}
                  </select>
                  {errors.country && (
                    <p className="text-red-500 text-sm">{errors.country.message}</p>
                  )}
                </div>


                
              </div>

              {/* Shipping Options */}
              {shippingOptions.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Shipping Options</h3>
                  {shippingOptions.map((option, idx) => (
                    <label key={idx} className="flex items-center gap-2">
                      <input
                        type="radio"
                        value={option.service}
                        {...register("shippingMethod")}
                        onChange={() => setSelectedShipping(option)}
                      />
                      {option.service} - {option.price} {option.currency}
                    </label>
                  ))}
                  {errors.shippingMethod && <p className="text-red-500 text-sm">{errors.shippingMethod.message}</p>}
                </div>
              )}

              {/* Payment Method */}
              <div>
                <h3 className="text-lg font-medium mb-3">Payment Method</h3>
                {["Mpesa", "Credit Card", "PayPal"].map((method) => (
                  <label key={method} className="flex items-center gap-2">
                    <input type="radio" value={method} {...register("payment")} />
                    {method}
                  </label>
                ))}
                {errors.payment && <p className="text-red-500 text-sm">{errors.payment.message}</p>}
              </div>

              <div>
                  <p  className="mt-4 ">Do you want to ship the Order to the billing address?</p>
                 
                  <Button type= 'submit'>Get Shipping Quote</Button>
                </div>

              <Button type="submit" className="w-full mt-6">Complete Order</Button>
            </form>
          </div>

          {/* Right Section - Order Summary */}
          <Card className="h-fit bg-transparent rounded-md">
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {order?.items?.length > 0 ? (
                order.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center gap-4">
                    <div className="flex items-center gap-3">
                      <img src={item.image} alt={item.name} className="w-12 h-12 object-cover rounded-md" />
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                      </div>
                    </div>
                    <span className="font-medium">${((item.final_price || item.price) * item.quantity).toFixed(2)}</span>
                  </div>
                ))
              ) : (
                <p className="text-gray-500 text-sm">Your cart is empty</p>
              )}

              <hr />
              <div className="flex justify-between font-semibold">
                <span>Subtotal</span>
                <span>${(totalOrder + shippingCost).toFixed(2)}</span>

              </div>
              <div className="flex justify-between">
  <span>Shipping</span>
  <span>
    {shippingOptions.length === 0
      ? "--" // no shipping rates available
      : selectedShipping
      ? `$${Number(selectedShipping.rate).toFixed(2)}`
      : "Select shipping"} 
  </span>
</div>

              <hr />
              <div className="flex justify-between font-bold text-lg">
                <span>Total</span>
                <span>${totalOrder.toFixed(2)}</span>
              </div>

              {/* Hidden PayPal Component for reference */}
              <div style={{ display: "none" }}>
                <CheckoutPaypalPayment order={order} />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
    </div>
  );
}
