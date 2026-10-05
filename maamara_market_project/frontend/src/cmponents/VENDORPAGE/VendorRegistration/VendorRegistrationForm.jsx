import React, { useState, useEffect, useRef } from "react";
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
import api, { getWebSocketUrl, resolveApiAssetUrl } from "../../../Services/Api";
import "./VendorRegistration.css";
import { getNames, getCodeList } from "country-list";
// import { useCustomerAccessGuard } from "../../Hooks/AccessCRF/CustomerAccess";
import { useNavigate } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { useAuth } from "../../Auth/AuthContext/Context";
import GPSLocationInput from "./GPSLocationInput";
import { generateVendorRegistrationAI } from "../../../Services/AI/vendorRegistrationAiService";
import {
  getVendorDraft,
  saveVendorDraft,
} from "../../../Services/VendorDrafts";

// Zod Schema with conditional validation

// form schema
  export const vendorSchema = z
    .object({
      // Basic Info
      surname_name: z.string().min(1),
      middle_name: z.string().optional(),
      first_name: z.string().min(1),
      phone_number: z.string().min(10).max(15),
  
      // Username comes from the authenticated user and is read-only.
      username: z.string().min(1, "Username is required"),
  
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
            .refine(
              (file) =>
                file instanceof File ||
                typeof file === "string" ||
                file === undefined,
              {
                message: "Image must be a file or existing image URL",
              }
            ),
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

      // ❗ Require either PDF or item list
      if (!data.item_pdf && (!data.item_list || data.item_list.length === 0)) {
        ctx.addIssue({
          path: ["item_list"],
          code: z.ZodIssueCode.custom,
          message: "Either item PDF or item list is required",
        });
      }

      // ❗ If item list is selected → validate all fields
      if (data.item_list && data.item_list.length > 0) {
        data.item_list.forEach((item, index) => {
          if (!item.name) {
            ctx.addIssue({
              path: ["item_list", index, "name"],
              code: z.ZodIssueCode.custom,
              message: "Item name is required",
            });
          }

          if (!item.description) {
            ctx.addIssue({
              path: ["item_list", index, "description"],
              code: z.ZodIssueCode.custom,
              message: "Item description is required",
            });
          }

          if (!item.price) {
            ctx.addIssue({
              path: ["item_list", index, "price"],
              code: z.ZodIssueCode.custom,
              message: "Item price is required",
            });
          }

          if (!item.image) {
            ctx.addIssue({
              path: ["item_list", index, "image"],
              code: z.ZodIssueCode.custom,
              message: "Item image is required",
            });
          }
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
 

  //define counries
  const countries = getNames();
    const [open, setOpen] = useState(false);
    const fileInputRef = useRef(null);

// submitting state
const [isSubmitting, setIsSubmitting] = useState(false);

        // Snackbar state
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("info"); // success, error, warning, info
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [formData, setFormData] = useState([])
  const [itemPreview, setItemPreview] = useState(null);
  const [companyLogoPreview, setCompanyLogoPreview] = useState(null);
  const [profilePicturePreview, setProfilePicturePreview] = useState(null);

  // Snackbar close handler
  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const [aiLoadingField, setAiLoadingField] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [workshopLocation, setWorkshopLocation] = useState({ locationSearch: "", latitude: null, longitude: null });
  const [addressLocation, setAddressLocation] = useState({ locationSearch: "", latitude: null, longitude: null });
  const [apartmentAddressLocation, setApartmentAddressLocation] = useState({ locationSearch: "", latitude: null, longitude: null });


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
      Are_You_KEBS_certified: "no",
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
  
  const watchedValues = form.watch();
const paymentMethod = form.watch("payment_method")
const mpesaType = form.watch("mpesa_type") // optional if you want sub-types
const country = form.watch("country");
const companyName = form.watch("company_name");
const workshopLocationValue = form.watch("workshop_location");
const productDescription = form.watch("product_description");
const productType = form.watch("product_type");
const websiteUrl = form.watch("website_url");

useEffect(() => {
  if (user?.username && watchedValues.username !== user.username) {
    form.setValue("username", user.username, { shouldDirty: false });
  }
}, [user?.username, watchedValues.username, form]);

useEffect(() => {
  const currentValue = workshopLocationValue || "";
  if (currentValue !== workshopLocation.locationSearch) {
    setWorkshopLocation((current) => ({ ...current, locationSearch: currentValue, latitude: null, longitude: null }));
  }
}, [workshopLocationValue]);

useEffect(() => {
  const currentValue = watchedValues.address || "";
  if (currentValue !== addressLocation.locationSearch) {
    setAddressLocation((current) => ({ ...current, locationSearch: currentValue, latitude: null, longitude: null }));
  }
}, [watchedValues.address]);

useEffect(() => {
  const currentValue = watchedValues.address_2 || "";
  if (currentValue !== apartmentAddressLocation.locationSearch) {
    setApartmentAddressLocation((current) => ({ ...current, locationSearch: currentValue, latitude: null, longitude: null }));
  }
}, [watchedValues.address_2]);

useEffect(() => {
  const value = watchedValues.vendor_company_logo;

  if (value instanceof File) {
    const url = URL.createObjectURL(value);
    setCompanyLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }

  setCompanyLogoPreview(resolveApiAssetUrl(value));
}, [watchedValues.vendor_company_logo]);

useEffect(() => {
  const value = watchedValues.profile_picture;

  if (value instanceof File) {
    const url = URL.createObjectURL(value);
    setProfilePicturePreview(url);
    return () => URL.revokeObjectURL(url);
  }

  setProfilePicturePreview(resolveApiAssetUrl(value));
}, [watchedValues.profile_picture]);

useEffect(() => {
  const value = itemFields.image;

  if (!(value instanceof File)) {
    setItemPreview(null);
    return;
  }

  const url = URL.createObjectURL(value);
  setItemPreview(url);

  return () => URL.revokeObjectURL(url);
}, [itemFields.image]);

useEffect(() => {
  if (country?.toLowerCase() === "kenya") {
    form.setValue("bank_swift_code", "");
    form.setValue("bank_iban", "");
    form.setValue("bank_currency", "");
    form.setValue("intermediary_bank_name", "");
    form.setValue("intermediary_swift_code", "");
  }
}, [country, form]);



 // Restore draft
const saveTimeout = useRef(null);
const isFirstRender = useRef(true);
const restoringDraft = useRef(false);

// Apply the server's canonical draft shape to the existing form state.
// WebSocket messages only invalidate the local copy; they never carry or
// mutate form data themselves.
const applyVendorDraftResponse = (response) => {
  if (!response?.exists || !response?.draft) return;

  restoringDraft.current = true;

  const draft = response.draft;
  form.reset(draft);

  setItems((currentItems) => {
    const restoredItems = (draft.item_list || []).map((item, index) => {
      let image = null;

      if (item.image) {
        if (item.image.startsWith("/media/")) {
          image = item.image;
        } else if (item.image.startsWith("http")) {
          image = item.image;
        } else {
          image = `/media/${item.image}`;
        }
      }

      const currentItem = currentItems[index];
      const hasLocalPreview =
        currentItem?.image instanceof File && currentItem?.preview;

      return {
        name: item.name || currentItem?.name || "",
        description: item.description || currentItem?.description || "",
        price: Number(item.price) || currentItem?.price || 0,
        image: hasLocalPreview ? currentItem.image : image,
        preview: hasLocalPreview
          ? currentItem.preview
          : resolveApiAssetUrl(image),
        image_asset_id:
          item.image_asset_id ?? currentItem?.image_asset_id ?? null,
      };
    });

    // Keep locally added items that the server has not returned yet.
    if (currentItems.length > restoredItems.length) {
      restoredItems.push(...currentItems.slice(restoredItems.length));
    }

    return restoredItems;
  });
  setUsePdf(draft.usePdf ?? false);

  setTimeout(() => {
    restoringDraft.current = false;
  }, 0);
};

// Initial hydration remains HTTP exactly as before.
useEffect(() => {
  let cancelled = false;

  const restoreDraft = async () => {
    try {
      const response = await getVendorDraft();
      if (!cancelled) applyVendorDraftResponse(response);
    } catch (error) {
      if (!cancelled) {
        console.error("Failed to restore vendor draft:", error);
        restoringDraft.current = false;
      }
    }
  };

  restoreDraft();

  return () => {
    cancelled = true;
  };
}, []);

// Realtime fetching only: the socket tells this page that its server-side
// draft changed, then the page performs the same canonical GET used above.
// Saving, validation, image uploads, and final submission remain HTTP and
// unchanged.
useEffect(() => {
  let socket = null;
  let reconnectTimer = null;
  let cancelled = false;

  const connect = () => {
    if (cancelled) return;

    socket = new WebSocket(getWebSocketUrl("/ws/realtime/"));

    socket.onmessage = async (event) => {
      try {
        const payload = JSON.parse(event.data || "{}");
        if (
          payload?.type !== "realtime.event" ||
          payload?.model !== "VendorDraft"
        ) {
          return;
        }

        const response = await getVendorDraft();
        if (!cancelled) {
          applyVendorDraftResponse(response);
        }
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to fetch realtime vendor draft:", error);
        }
      }
    };

    socket.onclose = () => {
      if (!cancelled) {
        reconnectTimer = setTimeout(connect, 3000);
      }
    };
  };

  connect();

  return () => {
    cancelled = true;
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (socket) socket.close();
  };
}, []);

// Persist the complete registration state, including item images, before
// autosave waits or final submission.
const persistVendorDraft = async () => {
  const draftFormData = new FormData();

  const draftData = {
    ...form.getValues(),
    item_list: items.map((item, index) => ({
      name: item.name || "",
      description: item.description || "",
      price: Number(item.price) || 0,
      image_index: item.image instanceof File ? index : null,
      image_asset_id:
        item.image instanceof File
          ? null
          : item.image_asset_id ?? null,
      image:
        typeof item.image === "string"
          ? item.image
          : null,
    })),
    usePdf,
  };

  // File objects cannot be JSON serialized; they are uploaded separately.
  draftFormData.append("data", JSON.stringify(draftData));

  items.forEach((item, index) => {
    if (item.image instanceof File) {
      draftFormData.append(`item_image_${index}`, item.image);
    }
  });

  const saved = await saveVendorDraft(draftFormData);

  if (saved?.draft_id) {
    form.setValue("draft_id", saved.draft_id, {
      shouldDirty: false,
      shouldValidate: false,
    });
  }

  // The backend is now the source of truth for the stored item image.
  if (saved?.draft?.item_list) {
    const savedItems = saved.draft.item_list;
    setItems((current) =>
      current.map((item, index) => ({
        ...item,
        image_asset_id:
          savedItems[index]?.image_asset_id ?? item.image_asset_id ?? null,
        preview:
          item.image instanceof File
            ? item.preview
            : resolveApiAssetUrl(savedItems[index]?.image || item.image),
      }))
    );
  }

  return saved;
};

// Autosave draft
useEffect(() => {

  if (isFirstRender.current) {
    isFirstRender.current = false;
    return;
  }


  if (restoringDraft.current) {
    return;
  }


  clearTimeout(saveTimeout.current);


  saveTimeout.current = setTimeout(async () => {
    try {
      await persistVendorDraft();
    } catch (error) {
      console.error("Draft save error:", error);
    }
  }, 2000);

  return () => {

    clearTimeout(
      saveTimeout.current
    );

  };


}, [
  watchedValues,
  items,
  usePdf
]);


  

  const handleGenerateAI = async (field) => {
    if (aiLoadingField) return;
    const isBrandField = field === "brand_name" || field === "brand_description";
    if (isBrandField && !companyName?.trim()) return;
    if (!isBrandField && !itemFields.image) return;

    setAiError(null);
    setAiLoadingField(field);

    try {
      const result = await generateVendorRegistrationAI({
        field,
        companyName,
        workshopLocation: workshopLocationValue || workshopLocation.locationSearch,
        productDescription,
        productType,
        websiteUrl,
        image: isBrandField ? null : itemFields.image,
      });

      const generatedValue = field === "brand_name" || field === "item_name" ? result?.name : result?.description;
      if (!generatedValue) throw new Error("AI did not return a usable value.");

      if (field === "brand_name") {
        form.setValue("brand_name", generatedValue, { shouldDirty: true, shouldValidate: true });
      } else if (field === "brand_description") {
        form.setValue("brand_description", generatedValue, { shouldDirty: true, shouldValidate: true });
      } else if (field === "item_name") {
        setItemFields((current) => ({ ...current, name: generatedValue }));
      } else {
        setItemFields((current) => ({ ...current, description: generatedValue }));
      }
    } catch (error) {
      console.error("Vendor registration AI generation failed:", error);
      setAiError(error.response?.data?.detail || error.message || "Unable to generate content right now.");
    } finally {
      setAiLoadingField(null);
    }
  };

  const handleAddItem = () => {
    if (
      !itemFields.name?.trim() ||
      !itemFields.description?.trim() ||
      !itemFields.price ||
      !(itemFields.image instanceof File)
    ) {
      return;
    }

    const preview = URL.createObjectURL(itemFields.image);

    const newItem = {
      name: itemFields.name.trim(),
      description: itemFields.description.trim(),
      price: parseFloat(itemFields.price),
      image: itemFields.image,
      preview,
      image_asset_id: null,
    };

    const updatedItems = [...items, newItem];

    setItems(updatedItems);
    form.setValue("item_list", updatedItems, {
      shouldDirty: true,
      shouldValidate: false,
    });

    setItemFields({
      name: "",
      description: "",
      price: "",
      image: null,
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  

  const handleRemoveItem = (index) => {
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
    form.setValue("item_list", updated);
  };

  const handleClearItems = () => {
    setItems([]);
    form.setValue("item_list", []);
};
  // Log individual field values (e.g., watch "product_type")
useEffect(() => {
 
}, [form.watch("product_type")]);


// HANDLE IMAGE CHANGE
useEffect(() => {
  return () => {
    if (itemPreview) {
      URL.revokeObjectURL(itemPreview);
    }
  };
}, [itemPreview]);


// -------------------- onSubmit --------------------
const onSubmit = async (data) => {

  setIsSubmitting(true);
  try {
    const formData = new FormData();

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

    // Add brand info if present
    if (brand_name || brand_description) {
      vendorData.brand = {
        name: brand_name || "",
        description: brand_description || "",
      };
    }

    // Persist the current form state and item image before submission.
    // This guarantees the approval workflow can resolve the same stored draft media.
    const savedDraft = await persistVendorDraft();
    if (savedDraft?.draft_id) {
      vendorData.draft_id = savedDraft.draft_id;
    }

    // Append vendor_data JSON
    formData.append("vendor_data", JSON.stringify(vendorData));

    // Handle brand_logo
    if (brand_logo instanceof File) {
      formData.append("brand_logo", brand_logo);
    }

    // Handle company logo
    if (vendor_company_logo instanceof File) {
      formData.append("vendor_company_logo", vendor_company_logo);
    }

    // Handle profile picture
    if (profile_picture instanceof File) {
      formData.append("profile_picture", profile_picture);
    }

    // Handle item PDF
    if (usePdf && item_pdf instanceof File) {
      formData.append("item_pdf", item_pdf);
    }

    // Handle item list
    if (!usePdf && items.length > 0) {
      const cleanedItemList = items.map((item, index) => {
        let imageKey = null;

        if (item.image instanceof File) {
          const safeFileName = item.image.name.replace(/\s+/g, "_");
          imageKey = `items/${safeFileName}`;

          formData.append(`item_image_${index}`, item.image);
        } else if (typeof item.image === "string") {
          imageKey = item.image;
        }

        return {
          name: item.name || "",
          description: item.description || "",
          price: Number(item.price) || 0,
          image: imageKey,
          image_asset_id:
            item.image instanceof File
              ? null
              : item.image_asset_id ?? null,
        };
      });

      formData.append("item_list", JSON.stringify(cleanedItemList));
    }

    // API Call
    const response = await api.post(
      "/api/vendor-request/",
      formData,
      {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" },
      }
    );

    if (response.status === 201) {
     

      setSnackbarSeverity("success");
      setSnackbarMessage("Vendor request submitted successfully!");
      setSnackbarOpen(true);

      navigate("/otp-vendor-verification", {
        state: { email: data.email },
      });
      

      setTimeout(() => setSnackbarOpen(false), 3000);
    } else {
      console.error("Failed submission:", response.data);

      setSnackbarSeverity("error");
      setSnackbarMessage(
        "Submission failed: Please check your network and try again!"
      );
      setSnackbarOpen(true);

      setTimeout(() => setSnackbarOpen(false), 3000);
    }
  } catch (error) {
    const status = error.response?.status;

    if (status === 401) {
      try {
        await api.post("/api/vendor-request/", formData, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (retryError) {
        if (retryError.response?.status === 401) {
          setSnackbarSeverity("error");
          setSnackbarMessage("Session expired. Redirecting to login...");
          setSnackbarOpen(true);

          setTimeout(() => {
            setSnackbarOpen(false);

            if (location) {
              navigate("/customer-login", {
                state: { from: location.pathname },
              });
            } else {
              navigate("/customer-login");
            }
          }, 6000);

          return;
        }

        console.error(
          "Retry error:",
          retryError.response?.data || retryError.message
        );

        setSnackbarSeverity("error");
        setSnackbarMessage("Something went wrong. Please try again.");
        setSnackbarOpen(true);

        setTimeout(() => setSnackbarOpen(false), 3000);
        return;
      }finally {
        setIsSubmitting(false); // always stop loading
      }
    } else {
      console.error("Submission error:", error.response?.data || error.message);

      setSnackbarSeverity("error");
      setSnackbarMessage("Something went wrong. Please try again.");
      setSnackbarOpen(true);

      setTimeout(() => setSnackbarOpen(false), 3000);
    }
  } finally {
    setIsSubmitting(false); // always stop loading
  }
};
  

  return (
  <div className="mm-vendor-registration w-full h-full overflow-y-hidden">
<div className="flex justify-center px-2 relative">
    <Form {...form}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        form.handleSubmit(onSubmit)(e);
      }}
      className="mm-vendor-registration-form space-y-6 w-100% relative border w-full p-2"
    >
        <section className="mm-vendor-section">
        {/* Personal Info */}
        <h2 className="text-xl font-semibold text-center">Personal Information</h2>

        {[
  "surname_name","middle_name","first_name","phone_number","email","id_number"
].map((fieldName) => (
  <FormField key={fieldName} name={fieldName} control={form.control} render={({ field }) => (
    <FormItem>
      <FormLabel>
        {fieldName.replace(/_/g, " ")}
        {fieldName !== "middle_name" && <span className="ml-1 text-error-600">*</span>}
      </FormLabel>
      <FormControl><Input {...field} id={fieldName} type="text" /></FormControl>
      <FormMessage />
    </FormItem>
  )} />
))}

        <FormField name="username" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Username <span className="ml-1 text-error-600">*</span></FormLabel>
            <FormControl>
              <Input {...field} id="username" type="text" readOnly tabIndex={-1} className="bg-muted/50 text-muted-foreground" />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />



      {/* country */}
      <FormField name="country" control={form.control} render={({ field }) => (
        <FormItem>
          <FormLabel>Country <span className="ml-1 text-error-600">*</span></FormLabel>
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
          <FormLabel>City <span className="ml-1 text-error-600">*</span></FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Address */}
      <FormField name="address" control={form.control} render={({ field }) => (
        <FormItem>
          <FormControl>
            <GPSLocationInput
              value={addressLocation}
              onChange={(nextLocation) => {
                setAddressLocation(nextLocation);
                field.onChange(nextLocation.locationSearch || "");
              }}
              label="Address"
              placeholder="Search your address..."
              required
              error={form.formState.errors.address?.message}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* address two */}
      <FormField name="address_2" control={form.control} render={({ field }) => (
        <FormItem>
          <FormControl>
            <GPSLocationInput
              value={apartmentAddressLocation}
              onChange={(nextLocation) => {
                setApartmentAddressLocation(nextLocation);
                field.onChange(nextLocation.locationSearch || "");
              }}
              label="Appartment Address (Optional)"
              placeholder="Search your apartment address..."
              required={false}
              error={form.formState.errors.address_2?.message}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

         </section>

       {/* Product Type */}
       <section className="mm-vendor-section">
       <h2 className="text-xl font-semibold text-center">Product Information</h2>

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
            Both (handmade & organic)
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

        </section>

        {/* Company Info */}
        <section className="mm-vendor-section">
        <h2 className="text-xl font-semibold text-center">Company Information</h2>

        <FormField name="company_name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Company Name</FormLabel>
            <FormControl><Input {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="workshop_location" control={form.control} render={({ field }) => (
          <FormItem>
            <FormControl>
              <GPSLocationInput
                value={workshopLocation}
                onChange={(nextLocation) => {
                  setWorkshopLocation(nextLocation);
                  field.onChange(nextLocation.locationSearch || "");
                }}
                required
                error={form.formState.errors.workshop_location?.message}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )} />
        <FormField name="vendor_company_logo" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Company Logo</FormLabel>
            <FormControl><Input type="file" key="company_logo" accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              field.onChange(file);
            }} />
            </FormControl>
            {companyLogoPreview && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={companyLogoPreview}
                  alt="Company logo preview"
                  className="h-20 w-20 rounded-xl border border-border bg-muted object-contain"
                  onError={() => setCompanyLogoPreview(null)}
                />
                <span className="text-xs text-muted-foreground">Logo preview</span>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />

        {aiError && <p className="text-sm text-error-600 dark:text-error-400" role="alert">{aiError}</p>}

        </section>

        {/* 🏷️ Brand Info */}
        <section className="mm-vendor-section">
        <h2 className="text-xl font-semibold text-center">Brand Information</h2>

        <FormField name="brand_name" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Name</FormLabel>
            <FormControl><Input type="text" placeholder="Enter brand name" {...field} value={field.value ?? ""} /></FormControl>
            <button type="button" disabled={!companyName?.trim() || !workshopLocationValue?.trim() || aiLoadingField !== null} onClick={() => handleGenerateAI("brand_name")} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              {aiLoadingField === "brand_name" ? "Generating..." : "Generate with AI"}
            </button>
            <FormMessage />
          </FormItem>
        )} />

        <FormField name="brand_description" control={form.control} render={({ field }) => (
          <FormItem>
            <FormLabel>Brand Description</FormLabel>
            <FormControl><Textarea {...field} value={field.value ?? ""} placeholder="Describe your brand..." /></FormControl>
            <button type="button" disabled={!companyName?.trim() || aiLoadingField !== null} onClick={() => handleGenerateAI("brand_description")} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
              <Sparkles className="h-4 w-4" />
              {aiLoadingField === "brand_description" ? "Generating..." : "Generate with AI"}
            </button>
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


        </section>

        {/* Payment Info */}
        {/* Payment Method Select */}
        <section className="mm-vendor-section">
    <h2 className="text-xl font-semibold text-center">Payment Information</h2>

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


        </section>

        {/* Optional */}
        <section className="mm-vendor-section">
        <h2 className="text-xl font-semibold text-center">Other Information</h2>

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
            <FormControl><Input type="file" accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0] || null;
              field.onChange(file);
            }} />
            </FormControl>
            {profilePicturePreview && (
              <div className="mt-3 flex items-center gap-3">
                <img
                  src={profilePicturePreview}
                  alt="Profile picture preview"
                  className="h-20 w-20 rounded-full border border-border bg-muted object-cover"
                  onError={() => setProfilePicturePreview(null)}
                />
                <span className="text-xs text-muted-foreground">Profile preview</span>
              </div>
            )}
            <FormMessage />
          </FormItem>
        )} />

        </section>

        {/* PDF or Item List Toggle */}
        <section className="mm-vendor-section">
        <h2 className="text-xl font-semibold text-center">Create Your Samples</h2>

        <div className="mm-vendor-sample-method">
          <FormLabel>Submit Items As</FormLabel>
          <div className="flex gap-4">
            <Button className="rounded-[20px] px-5 py-2.5" type="button" variant={usePdf ? "default" : "outline"} onClick={() => setUsePdf(true)}>PDF</Button>
            <Button className="rounded-[20px] px-5 py-2.5" type="button" variant={!usePdf ? "default" : "outline"} onClick={() => setUsePdf(false)}>Item List</Button>
          </div>
        </div>

        {usePdf ? (
          <div className="mm-vendor-sample-builder">
            <h3 className="mm-vendor-sample-builder-title">Upload Your Sample PDF</h3>
            <FormField name="item_pdf" control={form.control} render={({ field }) => (
              <FormItem className="mt-4">
                <FormLabel>Upload Item PDF</FormLabel>
                <FormControl>
                  <Input type="file" onChange={(e) => field.onChange(e.target.files?.[0])} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        ) : (
          <>
            <div className="mm-vendor-sample-builder">
              <h3 className="mm-vendor-sample-builder-title">Create Your Sample List</h3>
              <div className="grid grid-cols-1 gap-4 mt-4">
                <div>
                  <FormLabel>Item Image</FormLabel>
                  <Input type="file" ref={fileInputRef} accept="image/*" onChange={(e) => setItemFields({ ...itemFields, image: e.target.files?.[0] || null })} />
                  {itemPreview && (
                    <div className="mt-3 flex items-center gap-3">
                      <img
                        src={itemPreview}
                        alt="Selected item preview"
                        className="h-32 w-32 rounded-xl border border-border bg-muted object-cover"
                        onError={() => setItemPreview(null)}
                      />
                      <span className="text-xs text-muted-foreground">Selected image preview</span>
                    </div>
                  )}
                </div>
                <div>
                  <Input placeholder="Item Name" value={itemFields.name} onChange={(e) => setItemFields({ ...itemFields, name: e.target.value })} />
                  <button type="button" disabled={!itemFields.image || aiLoadingField !== null} onClick={() => handleGenerateAI("item_name")} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    <Sparkles className="h-4 w-4" />
                    {aiLoadingField === "item_name" ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
                <div>
                  <Textarea placeholder="Description" value={itemFields.description} onChange={(e) => setItemFields({ ...itemFields, description: e.target.value })} />
                  <button type="button" disabled={!itemFields.image || aiLoadingField !== null} onClick={() => handleGenerateAI("item_description")} className="mt-2 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50">
                    <Sparkles className="h-4 w-4" />
                    {aiLoadingField === "item_description" ? "Generating..." : "Generate with AI"}
                  </button>
                </div>
                <Input placeholder="Price" type="text" inputMode="numeric" pattern="[0-9]*" value={itemFields.price} onChange={(e) => { const value = e.target.value; if (/^\d*$/.test(value)) setItemFields({ ...itemFields, price: value }); }} />
              </div>
             <div className="flex justify-center w-full">
               <Button className='mt-4 primary-button' type="button" onClick={handleAddItem}>+ Add Item</Button>
             </div>
            </div>

            {items.length > 0 && (
          <div className="mm-vendor-items-added">
            <h4 className="mm-vendor-items-added-title">
              🧺 Items Added
            </h4>

            <div className="mm-vendor-items-added-list">
              {items.map((item, index) => {
                const imageSrc =
                  item.preview ||
                  (item.image instanceof File
                    ? item.preview
                    : resolveApiAssetUrl(item.image));

                return (
                  <div
                    key={index}
                    className="mm-vendor-item-card w-full rounded-[20px] border border-[#d8d4cc] bg-white p-5 shadow-[0_4px_16px_rgba(34,34,34,0.04)]"
                  >
                    <div className="flex min-w-0 flex-col gap-5 md:flex-row md:items-start md:justify-between">
                      <div className="flex min-w-0 flex-1 flex-col gap-5 md:flex-row md:gap-8">
                        <div className="order-2 min-w-0 flex-1 space-y-2 md:order-1">
                          <p className="text-sm font-medium text-[#45413c]"><span className="font-semibold text-[#222]">Name:</span> {item.name}</p>
                          <p className="text-sm font-medium text-[#45413c]"><span className="font-semibold text-[#222]">Price:</span> {item.price}</p>
                          <p className="break-words text-sm leading-6 text-[#45413c]">
                            <span className="font-semibold text-[#222]">Description:</span> {item.description}
                          </p>
                        </div>

                        <div className="order-1 flex w-full shrink-0 flex-col items-center md:order-2 md:w-36">
                          <p className="w-full truncate text-center text-sm text-[#45413c]" title={item.image instanceof File ? item.image.name : item.image}>
                            <strong>Image:</strong>{" "}
                            {item.image instanceof File
                              ? item.image.name
                              : item.image?.split("/").pop() || "Saved image"}
                          </p>
                          <div className="relative mt-2 h-32 w-32 shrink-0 overflow-hidden rounded-[16px] border border-[#d8d4cc] bg-[#f5f4f1] shadow-sm">
                            <div className="absolute inset-0 animate-pulse bg-gray-200" aria-label="Loading item image" />
                            {imageSrc && (
                              <img
                                src={imageSrc}
                                alt={item.name || "Item image"}
                                className="relative z-[1] block h-full w-full object-cover"
                                onLoad={(event) => {
                                  const skeleton = event.currentTarget.previousElementSibling;
                                  if (skeleton) skeleton.style.display = "none";
                                }}
                                onError={(event) => {
                                  event.currentTarget.style.display = "none";
                                }}
                              />
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="w-full shrink-0 md:w-auto">
                        <Button
                          type="button"
                          variant="destructive"
                          onClick={() => handleRemoveItem(index)}
                          className="w-full rounded-full md:w-auto"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mm-vendor-items-added-actions">
              <Button
                type="button"
                variant="outline"
                className="light-button text-red-500"
                onClick={handleClearItems}
              >
                🗑️ Clear All
              </Button>
            </div>
          </div>
        )}
          </>
        )}
        </section>

      <div className="w-full flex justify-center">
        <Button
        type="submit"
        className="mt-6 primary-button w-full"
        disabled={isSubmitting}

      >
        {isSubmitting ? "Submitting..." : "Submit Vendor Form"}
      </Button>
      </div>
      </form>
    </Form>

 {/* Snackbar Alert */}
 <Snackbar
  open={snackbarOpen}
  autoHideDuration={4000}
  onClose={handleCloseSnackbar}
  anchorOrigin={{ vertical: "top", horizontal: "right" }}
>
  <div className="fixed right-4 top-20 z-[1400] max-w-sm rounded-[20px] border border-gray-300 bg-card px-4 py-3 text-sm font-semibold text-card-foreground shadow-lg">
    {snackbarMessage}
    <button
      type="button"
      onClick={handleCloseSnackbar}
      className="ml-3 text-xs text-muted-foreground hover:text-card-foreground"
      aria-label="Dismiss notification"
    >
      ×
    </button>
  </div>
 </Snackbar>


 {/* 🔥 DEBUG PANEL (PUT IT HERE) */}
 {/* {process.env.NODE_ENV === "development" && (
      <div className="fixed bottom-0 left-0 right-0 bg-black text-green-400 text-xs p-2 max-h-40 overflow-auto z-[9999]">
        <p>FORM ERRORS:</p>
        <pre>{JSON.stringify(form.formState.errors, null, 2)}</pre>

        <p>VALUES:</p>
        <pre>{JSON.stringify(form.getValues(), null, 2)}</pre>
      </div>
    )} */}

    </div>
  </div>
    
  )
}