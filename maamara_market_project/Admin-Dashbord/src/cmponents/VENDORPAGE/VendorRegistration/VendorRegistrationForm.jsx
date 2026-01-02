import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "../../../../components/ui/form";
import { Input } from "../../../../components/ui/input";
import { Button } from "../../../../components/ui/button";
import { Textarea } from "../../../../components/ui/textarea";
import {
  Snackbar,
  Alert as MuiAlert
} from '@mui/material';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "../../../../components/ui/select";
import api from "../../../Services/Api";
import { getNames, getCodeList } from "country-list";
// import { useCustomerAccessGuard } from "../../Hooks/AccessCRF/CustomerAccess";
import { baseUrl } from "../../Constant/Constant";
import { useNavigate } from "react-router-dom";
import { useWatch } from "react-hook-form";
import { color } from "framer-motion";

// Zod Schema with conditional validation

// form schema
  export const vendorSchema = z
    .object({
      // Basic Info
      surname_name: z.string().min(1),
      middle_name: z.string().optional(),
      first_name: z.string().min(1),
      phone_number: z.string().min(10).max(15),
  
      // Username with strong requirements
      username: z
        .string()
        .min(8, "Must be at least 8 characters")
        .max(16, "Must be at most 16 characters")
        .refine((val) => /[a-z]/.test(val), {
          message: "Must include at least one lowercase letter",
        })
        .refine((val) => /[A-Z]/.test(val), {
          message: "Must include at least one uppercase letter",
        })
        .refine((val) => /[0-9]/.test(val), {
          message: "Must include at least one number",
        })
        .refine((val) => /[!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`~]/.test(val), {
          message: "Must include at least one symbol",
        }),
  
      email: z.string().email(),
  
      id_number: z.string().min(8),
      product_type: z.enum(["organic", "inorganic", "both"]),
      is_food: z.enum(["yes", "no"]).optional(),
      Are_You_KEBS_certified: z.enum(["yes", "no"]).optional(),
      product_description: z.string().min(1),
      company_name: z.string().min(1),
      workshop_location: z.string().min(1),
  
      // Address Details
      country: z.string().min(1, "Country is required"),
      city: z.string().min(1, "City is required"),
      address: z.string().min(1, "Address is required"),
      address_2: z.union([z.string().min(1), z.literal("")]).optional(),
  
      // Optional fields
      vendor_company_logo: z.any().optional(),
      payment_method: z.enum(["BANK_TRANSFER", "MOBILE_MONEY", "PAYPAL"]),
      mpesa_number: z.string().optional(),
      mpesa_type: z.union([z.enum(["PHONE", "TILL", "LIPA_NA_MPESA"]), z.literal("")]).optional(),
      mpesa_till: z.union([z.string().min(1), z.literal("")]).optional(),
      mpesa_paybill: z.union([z.string().min(1), z.literal("")]).optional(),
      paypal_email: z.union([z.string().email(), z.literal("")]).optional(),
      tax_number: z.union([z.string().min(1), z.literal("")]).optional(),
      website_url: z.union([z.string().url(), z.literal("")]).optional(),
  
      profile_picture: z.any().optional(),
      social_media_links: z.record(z.string()).optional(),

       // 🏦 Local Bank Fields (always relevant)
      bank_name: z.union([z.string().min(1), z.literal("")]).optional(),
      bank_branch: z.union([z.string().min(1), z.literal("")]).optional(),
      bank_account_name: z.union([z.string().min(1), z.literal("")]).optional(),
      bank_account_number: z.union([z.string().min(1), z.literal("")]).optional(),

      // 🌍 International Bank Fields (conditionally required)
      bank_swift_code: z.union([z.string().min(1), z.literal("")]).optional(),
      bank_iban: z.union([z.string().min(1), z.literal("")]).optional(),
      bank_currency: z.union([z.string().min(1), z.literal("")]).optional(),
      intermediary_bank_name: z.union([z.string().min(1), z.literal("")]).optional(),
      intermediary_swift_code: z.union([z.string().min(1), z.literal("")]).optional(),
    
      // Items
      item_pdf: z.any().optional(),
      item_list: z
      .array(
        z.object({
          name: z.string(),
          description: z.string(),
          price: z.number(),
          image: z
            .any()
            .refine((file) => file instanceof File || file === undefined, {
              message: "Image must be a file",
            }),
        })
      )
      .optional(),
      brand_name: z.string().optional().nullable(),
      brand_description: z.string().optional().nullable(),
      brand_logo: z
      .instanceof(File)
      .optional()
      .nullable()
      .or(z.string().optional().nullable())

    })

    // 🔁 Conditional logic and custom validation
    .superRefine((data, ctx) => {
      // Require at least one of item_pdf or item_list
      if (!data.item_pdf && (!data.item_list || data.item_list.length === 0)) {
        ctx.addIssue({
          path: ["item_list"],
          code: z.ZodIssueCode.custom,
          message: "Either item PDF or item list is required",
        });
      }
  
      // BANK_TRANSFER requires bank_account_number
      if (data.payment_method === "BANK_TRANSFER") {
        // 🔹 Always required fields
        if (!data.bank_account_number || data.bank_account_number.trim() === "") {
          ctx.addIssue({
            path: ["bank_account_number"],
            code: z.ZodIssueCode.custom,
            message: "Bank account number is required for Bank Transfer",
          });
        }
    
        if (!data.bank_name || data.bank_name.trim() === "") {
          ctx.addIssue({
            path: ["bank_name"],
            code: z.ZodIssueCode.custom,
            message: "Bank name is required for Bank Transfer",
          });
        }
    
        if (!data.bank_branch || data.bank_branch.trim() === "") {
          ctx.addIssue({
            path: ["bank_branch"],
            code: z.ZodIssueCode.custom,
            message: "Bank branch is required for Bank Transfer",
          });
        }
    
        if (!data.bank_account_name || data.bank_account_name.trim() === "") {
          ctx.addIssue({
            path: ["bank_account_name"],
            code: z.ZodIssueCode.custom,
            message: "Bank account name is required for Bank Transfer",
          });
        }
    
        // 🔹 International-only fields (if not based in Kenya)
        if (data.country?.toLowerCase() !== "kenya") {
          if (!data.bank_swift_code || data.bank_swift_code.trim() === "") {
            ctx.addIssue({
              path: ["bank_swift_code"],
              code: z.ZodIssueCode.custom,
              message: "SWIFT/BIC code is required for international vendors",
            });
          }
    
          if (!data.bank_iban || data.bank_iban.trim() === "") {
            ctx.addIssue({
              path: ["bank_iban"],
              code: z.ZodIssueCode.custom,
              message: "IBAN is required for international vendors",
            });
          }
    
          if (!data.bank_currency || data.bank_currency.trim() === "") {
            ctx.addIssue({
              path: ["bank_currency"],
              code: z.ZodIssueCode.custom,
              message: "Currency is required for international vendors",
            });
          }
        }
      } else {
        // ❌ Clear all bank-related data when not using Bank Transfer
        data.bank_account_number = undefined;
        data.bank_name = undefined;
        data.bank_branch = undefined;
        data.bank_account_name = undefined;
        data.bank_swift_code = undefined;
        data.bank_iban = undefined;
        data.bank_currency = undefined;
        data.intermediary_bank_name = undefined;
        data.intermediary_swift_code = undefined;
      }
  
     // MOBILE_MONEY validations
if (data.payment_method === "MOBILE_MONEY") {
  // Must provide at least one identifier
  if (
    (!data.mpesa_number || data.mpesa_number.trim() === "") &&
    (!data.mpesa_till || data.mpesa_till.trim() === "") &&
    (!data.mpesa_paybill || data.mpesa_paybill.trim() === "")
  ) {
    ctx.addIssue({
      path: ["mpesa_type"],
      code: z.ZodIssueCode.custom,
      message: "You must provide at least one M-Pesa identifier (Phone, Till, or Paybill).",
    });
  }

  // Then validate based on type
  if (!data.mpesa_type) {
    ctx.addIssue({
      path: ["mpesa_type"],
      code: z.ZodIssueCode.custom,
      message: "M-Pesa type is required for Mobile Money payment",
    });
  } else {
    if (data.mpesa_type === "PHONE" && (!data.mpesa_number || data.mpesa_number.trim() === "")) {
      ctx.addIssue({
        path: ["mpesa_number"],
        code: z.ZodIssueCode.custom,
        message: "M-Pesa phone number is required when type is PHONE",
      });
    }
    if (data.mpesa_type === "TILL" && (!data.mpesa_till || data.mpesa_till.trim() === "")) {
      ctx.addIssue({
        path: ["mpesa_till"],
        code: z.ZodIssueCode.custom,
        message: "Till number is required when type is TILL",
      });
    }
    if (data.mpesa_type === "LIPA_NA_MPESA" && (!data.mpesa_paybill || data.mpesa_paybill.trim() === "")) {
      ctx.addIssue({
        path: ["mpesa_paybill"],
        code: z.ZodIssueCode.custom,
        message: "Paybill number is required when type is Lipa Na Mpesa",
      });
    }
  }
} else {
  data.mpesa_number = undefined;
  data.mpesa_type = undefined;
  data.mpesa_till = undefined;
  data.mpesa_paybill = undefined;
}

  
      // PAYPAL email required
      if (data.payment_method === "PAYPAL") {
        if (!data.paypal_email || data.paypal_email.trim() === "") {
          ctx.addIssue({
            path: ["paypal_email"],
            code: z.ZodIssueCode.custom,
            message: "PayPal email is required for PayPal payment",
          });
        }
      } else {
        data.paypal_email = undefined;
      }
    });
  

 


export default function VendorForm() {
  // const isAllowed = useCustomerAccessGuard();
  // if (!isAllowed) return null;

  //define counries
  const countries = getNames();
    const [open, setOpen] = useState(false);


        // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("info"); // success, error, warning, info
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // Snackbar close handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const navigate = useNavigate();

  // useState for form data management
  const [usePdf, setUsePdf] = useState(true); // to toggle between PDF and item list
  const [itemFields, setItemFields] = useState({
    name: "",
    description: "",
    price: "",
    image: null,
  });
  const [items, setItems] = useState([]);

  const form = useForm({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      surname_name: "",
      middle_name: "",
      first_name: "",
      phone_number: "",
      username: "",
      email: "",
      password: "",
      confirm_password: "",
      id_number: "",
      product_type: "organic",
      is_food: "no",
      Are_You_KEBS_certified: "yes",
      product_description: "",
      company_name: "",
      workshop_location: "",
      vendor_company_logo: null,
      payment_method: "BANK_TRANSFER",
  
      // ===== Address =====
      country: "",
      city: "",
      address: "",
      address_2: "",
  
      // ===== Bank Transfer Fields =====
      bank_account_number: "",
      bank_account_name: "",
      bank_name: "",
      bank_branch: "",
  
      // 🔹 International Fields
      bank_swift_code: "",
      bank_iban: "",
      bank_currency: "",
      intermediary_bank_name: "",
      intermediary_swift_code: "",
  
      // ===== Mobile Money Fields =====
      mpesa_type: "",       // 'PHONE' | 'TILL' | 'LIPA_NA_MPESA'
      mpesa_number: "",
      mpesa_till: "",
      mpesa_paybill: "",
  
      // ===== PayPal =====
      paypal_email: "",
  
      // ===== Optional Details =====
      tax_number: "",
      website_url: "",
      profile_picture: null,
      social_media_links: {},
      item_pdf: null,
      item_list: [],
  
      // ===== Brand =====
      brand_name: "",
      brand_description: "",
      brand_logo: null,
    },
  });
  

const paymentMethod = form.watch("payment_method")
const mpesaType = form.watch("mpesa_type") // optional if you want sub-types
const country = form.watch("country");

useEffect(() => {
  if (country?.toLowerCase() === "kenya") {
    form.setValue("bank_swift_code", "");
    form.setValue("bank_iban", "");
    form.setValue("bank_currency", "");
    form.setValue("intermediary_bank_name", "");
    form.setValue("intermediary_swift_code", "");
  }
}, [country, form]);

  

  // console.log(form)

  useEffect(() => {
    console.log("Form Errors: ", form.formState.errors);
  }, [form.formState.errors]);
  

  const handleAddItem = () => {
    // Validate that all necessary fields are filled
    if (!itemFields.name || !itemFields.description || !itemFields.price) return;
  
    // Create a new item object
    const newItem = { ...itemFields, price: parseFloat(itemFields.price) };
  
    // Add the item to the state (item list)
    const updatedItems = [...items, newItem];
    setItems(updatedItems);
  
    // Update the 'item_list' field in the form
    form.setValue("item_list", updatedItems);  // Sync the form state with the updated items
  
    // Reset the item input fields
    setItemFields({ name: "", description: "", price: "", image: null });
  };
  

  const handleRemoveItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleClearItems = () => setItems([]);

  // Log individual field values (e.g., watch "product_type")
useEffect(() => {
 
}, [form.watch("product_type")]);

// // For more fields, you can do something like:
// console.log("Current form state: ", form.getValues());  // Log all form values

// -------------------- onSubmit --------------------
const onSubmit = async (data) => {
  try {
    const formData = new FormData();

    // Destructure all fields including files
    const {
      item_pdf,
      profile_picture,
      brand_logo,
      vendor_company_logo,
      brand_name,
      brand_description,
      ...rest
    } = data;

    // Build vendor_data object excluding File fields
    const vendorData = Object.fromEntries(
      Object.entries(rest).filter(
        ([, v]) => v !== undefined && !(v instanceof File)
      )
    );

    // ✅ Add brand info if present
    if (brand_name || brand_description) {
      vendorData.brand = {
        name: brand_name || "",
        description: brand_description || "",
      };
    }

    // ✅ Append vendor_data JSON
    formData.append("vendor_data", JSON.stringify(vendorData));

    // ✅ Handle brand_logo
    if (brand_logo instanceof File) {
      formData.append("brand_logo", brand_logo);
    }

    // ✅ Handle company logo
    if (vendor_company_logo instanceof File) {
      formData.append("vendor_company_logo", vendor_company_logo);
    }

    // ✅ Handle profile picture
    if (profile_picture instanceof File) {
      formData.append("profile_picture", profile_picture);
    }

    // ✅ Handle item PDF
    if (usePdf && item_pdf instanceof File) {
      formData.append("item_pdf", item_pdf);
    }

    // ✅ Handle item list
    if (!usePdf && items.length > 0) {
      const cleanedItemList = items.map((item, index) => {
        let imageKey = null;
    
        if (item.image instanceof File) {
          // ✅ Use the actual filename to build a realistic path
          const safeFileName = item.image.name.replace(/\s+/g, "_"); // remove spaces
          imageKey = `items/${safeFileName}`;
    
          // 👇 still append using a stable key the backend will look for
          formData.append(`item_image_${index}`, item.image);
        } else if (typeof item.image === "string") {
          imageKey = item.image; // Keep if already uploaded
        }
    
        return {
          ...item,
          price: Number(item.price),
          image: imageKey,
        };
      });
    
      formData.append("item_list", JSON.stringify(cleanedItemList));
    }
    

    // 🧪 Debugging output
    // for (const [key, value] of formData.entries()) {
    //   console.log(
    //     `${key}:`,
    //     value instanceof File ? `📎 ${value.name}` : value
    //   );
    // }

    // ✅ API Call
    const response = await api.post(`${baseUrl}/api/vendor-request/`, formData, {
      withCredentials: true,
      headers: { "Content-Type": "multipart/form-data" },
    });

    if (response.status === 201) {
      navigate("/otp-vendor-verification", { state: { email: data.email } });
      setSnackbarSeverity("success");
      setSnackbarMessage("Vendor request submitted successfully!");
      setSnackbarOpen(true);
    } else {
      console.error("Failed submission:", response.data);
      setSnackbarSeverity("error");
        setSnackbarMessage("Submission failed: " + JSON.stringify(response.data));
        setSnackbarOpen(true);
    }
  } catch (error) {
    console.error("Submission error:", error.response?.data || error.message);
      setSnackbarSeverity("error");
      setSnackbarMessage(
        "Something went wrong: " + JSON.stringify(error.response?.data || error.message)
      );
      setSnackbarOpen(true);
  }
};



  

  return (
    <div>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 flex w-100% container flex-col relative top-20">
        {/* Personal Info */}
        <h2 className="text-xl font-semibold mt-6 text-center">Personal Information</h2>

        {[
  "surname_name","middle_name","first_name","phone_number","username","email","id_number"
].map((fieldName) => (
  <FormField
    key={fieldName}
    name={fieldName}
    control={form.control}
    render={({ field }) => (
      <FormItem>
        <FormLabel>{fieldName.replace(/_/g, " ")}</FormLabel>
        <FormControl>
          <Input
            {...field}
            id={fieldName}
            type="text"
          />
        </FormControl>
        <FormMessage />
      </FormItem>
    )}
  />
))}



      {/* country */}
      <FormField name="country" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Country</FormLabel>
          <Select
            onValueChange={field.onChange}
            value={field.value}
            name="country"
            id="country"
          >
            <SelectTrigger id="country_trigger">
              <SelectValue placeholder="Select a country" />
            </SelectTrigger>
            <SelectContent>
              {countries.map(country => (
                <SelectItem key={country} value={country}>{country}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <FormMessage />
        </FormItem>
      )} />

        {/* City */}
      <FormField name="city" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>City</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Address */}
      <FormField name="address" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Address</FormLabel>
          <FormControl><Textarea {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* address two */}
      <FormField name="address_2" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Appartment Address(Optional)</FormLabel>
          <FormControl><Textarea {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

       {/* Product Type */}
       <h2 className="text-xl font-semibold mt-6 text-center">Product Information</h2>

       <FormField
  name="product_type"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      {/* Label linked to the Select via htmlFor */}
      <FormLabel htmlFor="product_type">Product Type</FormLabel>

      {/* Select component with name and id for form submission and accessibility */}
      <Select
        onValueChange={field.onChange}
        value={field.value}
        name="product_type"
        id={`product_type_${field.value}`}
      >
        {/* Trigger with its own id for accessibility or testing */}
        <SelectTrigger id="product_type_trigger">
          <SelectValue placeholder="Select" />
        </SelectTrigger>

        {/* Each SelectItem has a unique id for accessibility and testing */}
        <SelectContent>
          <SelectItem id="product_type_organic" value="organic">
            Organic Products
          </SelectItem>
          <SelectItem id="product_type_inorganic" value="inorganic">
            Handmade (inorganic)
          </SelectItem>
          <SelectItem id="product_type_both" value="both">
            Both (handmade & inorganic)
          </SelectItem>
        </SelectContent>
      </Select>

      <FormMessage />
    </FormItem>
  )}
/>




          {/* Conditionally show if product_type is organic or both */}
          {["organic", "both"].includes(form.watch("product_type")) && (
            <>
              {/* Is Food */}
              <FormField name="is_food" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="is_food">Is Food?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  name="is_food"
                  id="is_food"
                >
                  <SelectTrigger id="is_food_trigger">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id="is_food_yes" value="yes">Yes</SelectItem>
                    <SelectItem id="is_food_no" value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

              {/* KEBS Certified */}
              <FormField name="Are_You_KEBS_certified" control={form.control} render={({ field }) => (
              <FormItem>
                <FormLabel htmlFor="Are_You_KEBS_certified">KEBS Certified?</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  value={field.value}
                  name="Are_You_KEBS_certified"
                  id="Are_You_KEBS_certified"
                >
                  <SelectTrigger id="Are_You_KEBS_certified_trigger">
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem id="kebs_yes" value="yes">Yes</SelectItem>
                    <SelectItem id="kebs_no" value="no">No</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />

            </>
          )}


        {/* Product Description */}
        <FormField name="product_description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel htmlFor="product_description">Product Description</FormLabel>
            <FormControl><Textarea id="product_description" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* Company Info */}
        <h2 className="text-xl font-semibold mt-6 text-center">Company Information</h2>

        <FormField name="company_name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="workshop_location" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Workshop Location</FormLabel>
            <FormControl><Textarea {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="vendor_company_logo" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Company Logo</FormLabel>
            <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* 🏷️ Brand Info */}
        <h2 className="text-xl font-semibold mt-6 text-center">Brand Information</h2>

        <FormField name="brand_name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Name</FormLabel>
            <FormControl>
            <Input
              type="text"
              placeholder="Enter brand name"
              {...field}
              value={field.value ?? ""}
            />
            
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="brand_description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Description</FormLabel>
            <FormControl>
              <Textarea {...field} value={field.value ?? ""} placeholder="Describe your brand..." />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* <FormField name="brand_logo" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Logo</FormLabel>
            <FormControl>
              <Input
                type="file"
                onChange={(e) => field.onChange(e.target.files?.[0])}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} /> */}


        {/* Payment Info */}
        {/* Payment Method Select */}
    <h2 className="text-xl font-semibold mt-6 text-center">Payment Information</h2>

<FormField name="payment_method" control={form.control} render={({ field }) => (
  <FormItem>
    <FormLabel htmlFor="payment_method">Payment Method</FormLabel>
    <Select
      onValueChange={field.onChange}
      value={field.value}
      name="payment_method"
      id="payment_method"
    >
      <SelectTrigger id="payment_method_trigger">
        <SelectValue placeholder="Select" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem id="payment_method_bank" value="BANK_TRANSFER">Bank Transfer</SelectItem>
        <SelectItem id="payment_method_mobile" value="MOBILE_MONEY">M-Pesa</SelectItem>
        <SelectItem id="payment_method_paypal" value="PAYPAL">PayPal</SelectItem>
      </SelectContent>
    </Select>
    <FormMessage />
  </FormItem>
)} />

<div className="grid grid-cols-1 md:grid-cols-3 gap-4">

{/* Conditional: Bank Transfer */}
{paymentMethod === "BANK_TRANSFER" && (
  <>
    {/* Common fields for all vendors */}
    <FormField
      name="bank_account_number"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bank Account Number</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      name="bank_account_name"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Account Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      name="bank_name"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bank Name</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    <FormField
      name="bank_branch"
      control={form.control}
      render={({ field }) => (
        <FormItem>
          <FormLabel>Bank Branch</FormLabel>
          <FormControl>
            <Input {...field} />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* International fields only if not in Kenya */}
    {country?.toLowerCase() !== "kenya" && (
      <>
        <FormField
          name="bank_swift_code"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>SWIFT/BIC Code</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="bank_iban"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>IBAN</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="bank_currency"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency</FormLabel>
              <FormControl>
                <Input placeholder="e.g. USD, EUR" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="intermediary_bank_name"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intermediary Bank (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          name="intermediary_swift_code"
          control={form.control}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Intermediary SWIFT Code (optional)</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    )}
  </>
)}
</div>


{/* Conditional: Mobile Money / M-Pesa */}
{paymentMethod === "MOBILE_MONEY" && (
  <>
    {/* M-Pesa Type Selector */}
    <FormField name="mpesa_type" control={form.control} render={({ field }) => (
      <FormItem>
        <FormLabel htmlFor="mpesa_type">M-Pesa Type</FormLabel>
        <Select
          onValueChange={field.onChange}
          value={field.value}
          name="mpesa_type"
          id="mpesa_type"
        >
          <SelectTrigger id="mpesa_type_trigger">
            <SelectValue placeholder="Select M-Pesa Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="PHONE">Phone Number</SelectItem>
            <SelectItem value="TILL">Till Number</SelectItem>
            <SelectItem value="LIPA_NA_MPESA">Lipa na M-Pesa</SelectItem>
          </SelectContent>
        </Select>
        <FormMessage />
      </FormItem>
    )} />

    {/* Conditional Input Based on M-Pesa Type */}
    {mpesaType === "PHONE" && (
      <FormField name="mpesa_number" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>M-Pesa Phone Number</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    )}

    {mpesaType === "TILL" && (
      <FormField name="mpesa_till" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>M-Pesa Till Number</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    )}

    {mpesaType === "LIPA_NA_MPESA" && (
      <FormField name="mpesa_paybill" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Lipa na M-Pesa Paybill</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />
    )}
  </>
)}


        {/* Optional */}
        <h2 className="text-xl font-semibold mt-6 text-center">Other Information</h2>

        <FormField name="tax_number" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Tax Number</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="website_url" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Website</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="profile_picture" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Profile Picture</FormLabel>
            <FormControl><Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        {/* PDF or Item List Toggle */}
        <h2 className="text-xl font-semibold mt-6 text-center">Create Item List</h2>

        <div className="space-y-2">
          <FormLabel>Submit Items As</FormLabel>
          <div className="flex gap-4">
            <Button type="button" variant={usePdf ? "default" : "outline"} onClick={() => setUsePdf(true)}>PDF</Button>
            <Button type="button" variant={!usePdf ? "default" : "outline"} onClick={() => setUsePdf(false)}>Item List</Button>
          </div>
        </div>

        {usePdf ? (
          <FormField name="item_pdf" control={form.control} render={({ field }) => (
            <FormItem>
              <FormLabel>Upload Item PDF</FormLabel>
              <FormControl>
                <Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        ) : (
          <>
            <div>
              <h1 className="text-xl">Create Your Item List</h1>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Input placeholder="Item Name" value={itemFields.name} onChange={(e) => setItemFields({ ...itemFields, name: e.target.value })} />
                <Input
                  placeholder="Price"
                  type="text"            // use text, number still allows "e" etc.
                  inputMode="numeric"    // mobile shows number keypad
                  pattern="[0-9]*"       // browser-level validation (digits only)
                  value={itemFields.price}
                  onChange={(e) => {
                    const value = e.target.value;
                    // ✅ allow only digits
                    if (/^\d*$/.test(value)) {
                      setItemFields({ ...itemFields, price: value });
                    }
                  }}
                />

                <Textarea placeholder="Description" value={itemFields.description} onChange={(e) => setItemFields({ ...itemFields, description: e.target.value })} />
                <Input type="file" onChange={(e) => setItemFields({ ...itemFields, image: e.target.files?.[0] })} />
              </div>
              <Button type="button" onClick={handleAddItem}>➕ Add Item</Button>
            </div>

            {items.length > 0 && (
              <div className="space-y-1">
                <h4 className="font-medium text-2xl">🧺 Items Added</h4>
                {items.map((item, index) => (
                  <div key={index} className="border px-2 py-1 rounded-md flex justify-between">
                    <div className="flex gap-20">
                      <p><strong>Name:</strong> {item.name}</p>
                      <p><strong>Price:</strong> {item.price}</p>
                      <p><strong>Description:</strong> {item.description}</p>
                      {item.image && (
                      <div className="flex flex-col items-center">
                      <p><strong>Image:</strong> {item.image.name}</p>
                      <img
                        src={URL.createObjectURL(item.image)}
                        alt="Item preview"
                        className="w-20 h-20 object-cover rounded-md mt-1"
                      />
                    </div>
                  )}    
                    </div>
                    <Button variant="destructive" onClick={() => handleRemoveItem(index)}>Remove</Button>
                  </div>
                ))}
                <Button variant="outline" onClick={handleClearItems}>🗑️ Clear All</Button>
              </div>
            )}
          </>
        )}

        <Button type="submit" className="mt-6">Submit Vendor Form</Button>
      </form>
    </Form>

 {/* Snackbar Alert */}
 <Snackbar
  open={snackbarOpen}
  autoHideDuration={4000}
  onClose={handleCloseSnackbar}
  anchorOrigin={{ vertical: "top", horizontal: "right" }}
>
  <MuiAlert
    onClose={handleCloseSnackbar}
    severity={snackbarSeverity}
    elevation={6}
    variant="filled"
    sx={{ width: "100%" }}
  >
    {snackbarMessage}
  </MuiAlert>
</Snackbar>



    </div>
    
  )
}
