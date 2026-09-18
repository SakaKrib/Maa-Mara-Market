import { z } from "zod";

export const checkoutSchema = z.object({
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

export const defaultCheckoutValues = {
  firstName: "",
  lastName: "",
  email: "",
  address: "",
  apartment: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  phone: "",
  payment: undefined,
  shippingMethod: "",
};
