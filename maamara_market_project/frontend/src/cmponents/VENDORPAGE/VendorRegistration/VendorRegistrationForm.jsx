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
import api from "../../../Services/Api";
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

      if (!data.item_pdf && (!data.item_list || data.item_list.length === 0)) {
        ctx.addIssue({
          path: ["item_list"],
          code: z.ZodIssueCode.custom,
          message: "Either item PDF or item list is required",
        });
      }

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

      if (data.payment_method === "BANK_TRANSFER") {
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

if (data.payment_method === "MOBILE_MONEY") {
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
  const countries = getNames();
  const [open, setOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarSeverity, setSnackbarSeverity] = useState("info");
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [formData, setFormData] = useState([])
  const [itemPreview, setItemPreview] = useState(null);

  const handleCloseSnackbar = (event, reason) => {
    if (reason === "clickaway") return;
    setSnackbarOpen(false);
  };

  const navigate = useNavigate();
  const { user } = useAuth();
  const [aiLoadingField, setAiLoadingField] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [workshopLocation, setWorkshopLocation] = useState({ locationSearch: "", latitude: null, longitude: null });

  const [usePdf, setUsePdf] = useState(true);
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
      country: "",
      city: "",
      address: "",
      address_2: "",
      bank_account_number: "",
      bank_account_name: "",
      bank_name: "",
      bank_branch: "",
      bank_swift_code: "",
      bank_iban: "",
      bank_currency: "",
      intermediary_bank_name: "",
      intermediary_swift_code: "",
      mpesa_type: "",
      mpesa_number: "",
      mpesa_till: "",
      mpesa_paybill: "",
      paypal_email: "",
      tax_number: "",
      website_url: "",
      profile_picture: null,
      social_media_links: {},
      item_pdf: null,
      item_list: [],
      brand_name: "",
      brand_description: "",
      brand_logo: null,
    },
  });

  const watchedValues = form.watch();
  const paymentMethod = form.watch("payment_method")
  const mpesaType = form.watch("mpesa_type")
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
    if (currentValue && currentValue !== workshopLocation.locationSearch) {
      setWorkshopLocation((current) => ({ ...current, locationSearch: currentValue, latitude: null, longitude: null }));
    }
  }, [workshopLocationValue]);

  useEffect(() => {
    if (country?.toLowerCase() === "kenya") {
      form.setValue("bank_swift_code", "");
      form.setValue("bank_iban", "");
      form.setValue("bank_currency", "");
      form.setValue("intermediary_bank_name", "");
      form.setValue("intermediary_swift_code", "");
    }
  }, [country, form]);

  const saveTimeout = useRef(null);
  const isFirstRender = useRef(true);
  const restoringDraft = useRef(false);

  useEffect(() => {
    const restoreDraft = async () => {
      try {
        const response = await getVendorDraft();

        if (!response.exists) return;

        restoringDraft.current = true;

        const draft = response.draft;

        form.reset(draft);

        const restoredItems = (draft.item_list || []).map((item) => {
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

          return {
            name: item.name || "",
            description: item.description || "",
            price: Number(item.price) || 0,
            image,
            image_asset_id: item.image_asset_id ?? null,
          };
        });

        setItems(restoredItems);

        form.setValue("item_list", restoredItems);
        setUsePdf(draft.usePdf ?? false);

        setTimeout(() => {
          restoringDraft.current = false;
        }, 0);
      } catch (error) {
        console.error("Failed to restore vendor draft:", error);
        restoringDraft.current = false;
      }
    };

    restoreDraft();
  }, []);

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
        const draftFormData = new FormData();

        const draftData = {
          ...watchedValues,
          item_list: items.map((item, index) => ({
            name: item.name || "",
            description: item.description || "",
            price: Number(item.price) || 0,
            image_index:
              item.image instanceof File
                ? index
                : null,
            image_asset_id:
              item.image instanceof File
                ? null
                : item.image_asset_id ?? null,
            image:
              typeof item.image === "string"
                ? item.image
                : null,
          })),
          usePdf
        };

        draftFormData.append("data", JSON.stringify(draftData));

        items.forEach((item, index) => {
          if (item.image instanceof File) {
            draftFormData.append(`item_image_${index}`, item.image);
          }
        });

        await saveVendorDraft(draftFormData);
      } catch (error) {
        console.error("Draft save error:", error);
      }
    }, 2000);

    return () => {
      clearTimeout(saveTimeout.current);
    };
  }, [watchedValues, items, usePdf]);

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

  const handleAddItem = async () => {
    if (
      !itemFields.name ||
      !itemFields.description ||
      !itemFields.price ||
      !itemFields.image
    ) {
      return;
    }

    const preview = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(itemFields.image);
    });

    const newItem = {
      ...itemFields,
      price: parseFloat(itemFields.price),
      preview,
    };

    const updatedItems = [...items, newItem];

    setItems(updatedItems);
    form.setValue("item_list", updatedItems);

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

  useEffect(() => {
    return () => {
      if (itemPreview) {
        URL.revokeObjectURL(itemPreview);
      }
    };
  }, [itemPreview]);

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

      const vendorData = Object.fromEntries(
        Object.entries(rest).filter(
          ([, v]) => v !== undefined && !(v instanceof File)
        )
      );

      if (brand_name || brand_description) {
        vendorData.brand = {
          name: brand_name || "",
          description: brand_description || "",
        };
      }

      if (watchedValues.draft_id) {
        vendorData.draft_id = watchedValues.draft_id;
      }

      formData.append("vendor_data", JSON.stringify(vendorData));

      if (brand_logo instanceof File) {
        formData.append("brand_logo", brand_logo);
      }

      if (vendor_company_logo instanceof File) {
        formData.append("vendor_company_logo", vendor_company_logo);
      }

      if (profile_picture instanceof File) {
        formData.append("profile_picture", profile_picture);
      }

      if (item_pdf instanceof File) {
        formData.append("item_pdf", item_pdf);
      }

      const itemList = data.item_list || [];
      itemList.forEach((item, index) => {
        if (item.image instanceof File) {
          formData.append(`item_image_${index}`, item.image);
        }
      });

      const response = await api.post("/api/vendor-request/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setSnackbarSeverity("success");
      setSnackbarMessage("Vendor application submitted successfully.");
      setSnackbarOpen(true);
      setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      console.error("Vendor submission error:", error);
      setSnackbarSeverity("error");
      setSnackbarMessage(error.response?.data?.detail || "Vendor submission failed.");
      setSnackbarOpen(true);
    } finally {
      setIsSubmitting(false);
    }
  };