import React, { useCallback, useMemo, useState, useEffect } from "react";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
  } from "../../../../../components/ui/form";
  import { Input } from "../../../../../components/ui/input";
  import { Textarea } from "../../../../../components/ui/textarea";
  import { Button } from "../../../../../components/ui/button";
import Checkbox from "../../../../../components/ui/checkbox";
import api, { resolveApiAssetUrl } from "../../../../Services/Api/";
import { useForm } from "react-hook-form";
import { organicAttributes, inorganicAttributes } from "./itemattribute";
import { Controller } from "react-hook-form";
import { useDepartments } from "./useDepartments";
import { FormControlLabel, Switch } from "@mui/material";
import useItemDraftAutosave from "./useItemDraftAutosave";

// Sizes
const MAX_ITEM_IMAGES = 10;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_VIDEO_BYTES = 100 * 1024 * 1024;
const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"];
const VIDEO_EXTENSIONS = [".mp4", ".mov", ".webm"];

const sizeOptions = [
  "XS", "S", "M", "L", "XL", "2XL", "3XL", "2XS", "3XS", "Oversize"
];

// Colors
export const colorOptions = [
  "Red", "Blue", "Green", "Yellow", "Pink", "Purple", "Orange", "Black",
  "White", "Grey", "Brown", "Beige", "Navy", "Teal", "Maroon", "Olive",
  "Turquoise", "Gold", "Silver", "Multicolor"
];

export const colorMap = {
  Red: "#FF0000",
  Blue: "#0000FF",
  Green: "#008000",
  Yellow: "#FFFF00",
  Pink: "#FFC0CB",
  Purple: "#800080",
  Orange: "#FFA500",
  Black: "#000000",
  White: "#FFFFFF",
  Grey: "#808080",
  Brown: "#A52A2A",
  Beige: "#F5F5DC",
  Navy: "#000080",
  Teal: "#008080",
  Maroon: "#800000",
  Olive: "#808000",
  Turquoise: "#40E0D0",
  Gold: "#FFD700",
  Silver: "#C0C0C0",
  Multicolor: "linear-gradient(to right, red, orange, yellow, green, blue, purple)"
};

const shoeGenders = ["Men", "Women", "Unisex", "Children"];

const adultSizes = ["36","37","38","39","40","41","42","43","44","45","46","47"];

const kidsSizeOptions = [
  "Newborn", "0-3M", "3-6M", "6-9M", "9-12M",
  "12-18M", "18-24M", "2T", "3T", "4T", "5T",
  "XS", "S", "M", "L"
];

const shoeTypes = ["Sneakers", "Sandals", "Boots", "Heels"];

const OCCASION_OPTIONS = [
  { key: "wedding", label: "Wedding" },
  { key: "engagement", label: "Engagement" },
  { key: "birthday", label: "Birthday" },
  { key: "graduation", label: "Graduation" },
  { key: "anniversary", label: "Anniversary" },
  { key: "baby-shower", label: "Baby Shower" },
  { key: "traditional-ceremony", label: "Traditional Ceremony" },
  { key: "gifts", label: "Gifts" },
  { key: "souvenirs", label: "Souvenirs" },
  { key: "home", label: "Home" },
  { key: "office", label: "Office" },
];


const ItemAddNew = ({ initialItem, vendorId, itemId, onSave = () => {}, vendor, isAdmin = false, adminCreateNew = false }) => {
  const { departmentMap, organicDepartmentMap } = useDepartments();

  // Vendor data may arrive directly or nested under vendor_data (vendor-request API).
  const productType = String(
    vendor?.product_type ?? vendor?.vendor_data?.product_type ?? ""
  ).trim().toLowerCase();

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [isCustomAttribute, setIsCustomAttribute] = useState(false);
  const [colorVariants, setColorVariants] = useState([]);
  const [galleryImages, setGalleryImages] = useState([]);
  const [productVideo, setProductVideo] = useState(null);
  const [draftMessage, setDraftMessage] = useState("");
  const [draftError, setDraftError] = useState("");

  const [selectedSection, setSelectedSection] = useState(() => {
    const existingSection = String(initialItem?.section || "").trim().toLowerCase();

    if (existingSection === "organic" || existingSection === "inorganic") {
      return existingSection;
    }

    // For a new item, the vendor's product type determines the section.
    return productType === "inorganic" ? "inorganic" : "organic";
  });
  const [showExtraFields, setShowExtraFields] = useState(false);

  // An existing item prop means vendor edit mode. A missing item means create mode.
  const isEditing = Boolean(initialItem?.id);
  // Vendor edits keep protected fields muted; admin item creation/editing never does.
  const shouldMuteProtectedFields = isEditing && !isAdmin;

    const form = useForm({
      defaultValues: initialItem || {},
      mode: "onChange",
    });

    // Initialize the form with the item's existing data
    useEffect(() => {
      if (!initialItem) return;
      form.reset({
        ...initialItem,
        image: initialItem.image || "",
        section: initialItem.section || "",
        // Normalize backend serializer names to the names used by this form.
        color_variants: (initialItem.variants || initialItem.color_variants || []).map((variant) => ({
          id: variant.id,
          color: variant.color,
          color_image: variant.image ?? variant.color_image ?? null,
          sizes: (variant.sizes || []).map((size) => ({
            id: size.id,
            size: size.size,
            quantity_in_stock: size.quantity_in_stock ?? size.stock ?? 0,
          })),
        })),
        size_variant: (initialItem.size_only_icon || initialItem.size_variant || []).map((size) => ({
          id: size.id,
          size: size.size,
          stock: size.quantity_in_stock ?? size.stock ?? 0,
        })),
        kids_sizes: (initialItem.kids_sizes || []).map((size) => ({
          id: size.id,
          age_group: size.age_group ?? size.size ?? "",
          size: size.age_group ?? size.size ?? "",
          quantity_in_stock: size.quantity_in_stock ?? size.stock ?? 0,
          stock: size.quantity_in_stock ?? size.stock ?? 0,
        })),
        ...(Array.isArray(initialItem.shoe_input) && initialItem.shoe_input.length > 0
          ? {
              shoe_type: initialItem.shoe_input[0].shoe_type || "",
              shoe_gender: initialItem.shoe_input[0].shoe_gender || "",
              shoe_size: Array.isArray(initialItem.shoe_input[0].shoe_size)
                ? initialItem.shoe_input[0].shoe_size
                : initialItem.shoe_input[0].shoe_size
                  ? [initialItem.shoe_input[0].shoe_size]
                  : [],
            }
          : {}),
      });
      setSelectedDepartment(initialItem.department || "");
      setSelectedCategory(initialItem.category || "");
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      setIsCustomAttribute(false);
      const existingSection = String(initialItem.section || "").trim().toLowerCase();
    if (existingSection === "organic" || existingSection === "inorganic") {
      setSelectedSection(existingSection);
    }
    }, [initialItem, form]);

    const {
      control,
      setValue,
      watch,
      handleSubmit,
      formState: { errors },
    } = form;

  const selectedCatSizes = watch("category");
  const selectedCatChildSize = watch("category");
  const selectedColors = watch("color") || [];
  const selectedSizes = watch("size") || [];
  const selectedSubcategory = form.watch("subcategory") || "";
  const draftValues = watch();

  const handleDraftRestore = useCallback(
    (draft) => {
      const restoredData = { ...(draft?.data || {}) };
      delete restoredData.draft_id;

      const media = Array.isArray(draft?.media) ? draft.media : [];
      const mainMedia = media.find((asset) => asset.kind === "main");
      const videoMedia = media.find((asset) => asset.kind === "video");

      const restoredVariants = (restoredData.color_variants || []).map((variant) => {
        const variantMedia = media.find(
          (asset) =>
            asset.kind === "variant" &&
            String(asset.variant_key).toLowerCase() === String(variant.color).toLowerCase()
        );
        return {
          ...variant,
          color_image: variantMedia?.url || variant.color_image || null,
        };
      });

      form.reset({
        ...restoredData,
        image: mainMedia?.url || restoredData.image || "",
        video: videoMedia?.url || restoredData.video || "",
        color_variants: restoredVariants,
      });

      setSelectedDepartment(restoredData.department || "");
      setSelectedCategory(restoredData.category || "");

      setGalleryImages(
        media
          .filter((asset) => asset.kind === "gallery")
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((asset) => ({
            slotKey: asset.slot_key,
            value: asset.url,
            url: asset.url,
            name: asset.name,
          }))
      );

      if (videoMedia) {
        setProductVideo({
          slotKey: "video",
          value: videoMedia.url,
          url: videoMedia.url,
          name: videoMedia.name,
        });
      } else {
        setProductVideo(null);
      }

      setDraftMessage("Saved draft restored.");
      setDraftError("");
    },
    [form]
  );

  const handleDraftSaved = useCallback(
    (draft) => {
      const media = Array.isArray(draft?.media) ? draft.media : [];
      const mainMedia = media.find((asset) => asset.kind === "main");
      const videoMedia = media.find((asset) => asset.kind === "video");

      if (mainMedia?.url) {
        form.setValue("image", mainMedia.url, { shouldDirty: false });
      }

      if (videoMedia?.url) {
        form.setValue("video", videoMedia.url, { shouldDirty: false });
        setProductVideo((current) => ({
          ...(current || {}),
          slotKey: "video",
          value: videoMedia.url,
          url: videoMedia.url,
          name: videoMedia.name,
        }));
      }

      setGalleryImages(
        media
          .filter((asset) => asset.kind === "gallery")
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
          .map((asset) => ({
            slotKey: asset.slot_key,
            value: asset.url,
            url: asset.url,
            name: asset.name,
          }))
      );

      const savedVariantMedia = new Map(
        media
          .filter((asset) => asset.kind === "variant")
          .map((asset) => [String(asset.variant_key).toLowerCase(), asset.url])
      );

      const currentVariants = form.getValues("color_variants") || [];
      form.setValue(
        "color_variants",
        currentVariants.map((variant) => ({
          ...variant,
          color_image:
            savedVariantMedia.get(String(variant.color).toLowerCase()) ||
            variant.color_image ||
            null,
        })),
        { shouldDirty: false }
      );

      setDraftMessage("Draft saved.");
      setDraftError("");
    },
    [form]
  );

  const draftMedia = useMemo(() => {
    const assets = [];
    const mainImage = draftValues.image;
    if (mainImage) {
      assets.push({
        slotKey: "main",
        kind: "main",
        value: mainImage,
        sortOrder: 0,
      });
    }

    galleryImages.forEach((asset, index) => {
      assets.push({
        slotKey: asset.slotKey || "gallery:" + index,
        kind: "gallery",
        value: asset.value,
        sortOrder: index + 1,
      });
    });

    (draftValues.color_variants || []).forEach((variant, index) => {
      if (!variant?.color_image) return;
      assets.push({
        slotKey: "variant:" + variant.color,
        kind: "variant",
        variantKey: variant.color,
        value: variant.color_image,
        sortOrder: 20 + index,
      });
    });

    if (productVideo?.value) {
      assets.push({
        slotKey: "video",
        kind: "video",
        value: productVideo.value,
        sortOrder: 100,
      });
    }

    return assets;
  }, [draftValues, galleryImages, productVideo]);

  const draftEnabled = !isEditing && !initialItem;
  const {
    draftId,
    restoring: draftRestoring,
    saving: draftSaving,
    lastSavedAt,
    saveNow: saveDraftNow,
    error: draftAutosaveError,
  } = useItemDraftAutosave({
    enabled: draftEnabled,
    values: draftValues,
    media: draftMedia,
    onRestore: handleDraftRestore,
    onSaved: handleDraftSaved,
  });

  useEffect(() => {
    if (draftAutosaveError) setDraftError(String(draftAutosaveError));
  }, [draftAutosaveError]);


  // Organic section automatically starts with both organic flags enabled.
  // The vendor can explicitly uncheck them; changing to Handmade/Inorganic
  // clears them and the organic-only fields.
  useEffect(() => {
    if (selectedSection === "organic") {
      form.setValue("is_organic", true);
      form.setValue("is_fresh_food", true);
      return;
    }

    form.setValue("is_organic", false);
    form.setValue("is_fresh_food", false);
    form.setValue("manufactured_date", "");
    form.setValue("expiry_date", "");
    form.setValue("roast_type", "");
    form.setValue("coffee_state", "");
  }, [selectedSection, form]);

  // Define department and category based on the vendor product type.
  const [activeData, setActiveData] = useState(null);

  useEffect(() => {
    // Existing items may be opened from inventory without a vendor object.
    // In that case, the saved section is the source of truth for the
    // department/category dataset.
    const existingSection = String(initialItem?.section || "").trim().toLowerCase();
    const section =
      existingSection === "organic" || existingSection === "inorganic"
        ? existingSection
        : productType === "organic" || productType === "inorganic"
          ? productType
          : selectedSection;

    if (section === "organic") {
      setSelectedSection("organic");
      setActiveData(organicDepartmentMap);
      setValue("section", "organic");
      return;
    }

    if (section === "inorganic") {
      setSelectedSection("inorganic");
      setActiveData(departmentMap);
      setValue("section", "inorganic");
    }
  }, [
    productType,
    selectedSection,
    initialItem?.section,
    setValue,
    organicDepartmentMap,
    departmentMap,
  ]);

  // Keep the saved department visible when the department dataset becomes
  // available after the edit form has already been initialized.
  useEffect(() => {
    if (!initialItem?.department || !activeData) return;

    const savedDepartment = String(initialItem.department).trim();
    const matchingDepartment = Object.keys(activeData).find(
      (department) =>
        department.toLowerCase() === savedDepartment.toLowerCase()
    );

    if (matchingDepartment) {
      setSelectedDepartment(matchingDepartment);
      setValue("department", matchingDepartment);
    }
  }, [initialItem?.department, activeData, setValue]);

  // Reset the entire form when activeData changes for a new item.
  const emptyValues = {
    item_attribute: undefined,
    occasions: [],
    is_food: false,
    is_organic: false,
    roast_type: "",
    coffee_state: "",

    image: undefined,
    video: "",

    color_variants: [],
    size_variant: [],
    kids_sizes: [],
    shoe_type: "",
    shoe_gender: "",
    shoe_size: [],

    length: { value: null, unit: "cm" },
    weight: { value: null, unit: "kg" },

    manufactured_date: "",
    expiry_date: "",
  };

  useEffect(() => {
    if (initialItem) return;
    if (activeData === organicDepartmentMap) {
      form.reset({ ...emptyValues, section: "organic" });
    } else if (activeData === departmentMap) {
      form.reset({ ...emptyValues, section: "inorganic" });
    }
  }, [activeData, form, initialItem]);

  // Organic-only fields must never remain active when the form is switched
  // to Handmade/Inorganic. This keeps vendor and admin approval flows aligned.
  useEffect(() => {
    if (selectedSection !== "organic") {
      setValue("is_organic", false);
      setValue("is_fresh_food", false);
      setValue("manufactured_date", "");
      setValue("expiry_date", "");
      setValue("roast_type", "");
      setValue("coffee_state", "");
    }
  }, [selectedSection, setValue]);

  // Reset manufactured/expiry dates when activeData changes
  useEffect(() => {
    if (activeData !== organicDepartmentMap) {
      form.setValue("manufactured_date", null);
      form.setValue("expiry_date", null);

      // Also unregister so validation doesn't trigger
      form.unregister("manufactured_date");
      form.unregister("expiry_date");
    }
  }, [activeData, form]);

    // Update returnable
    useEffect(() => {
      if (initialItem) {
        form.setValue("returnable", initialItem.returnable ?? true);
      }
    }, [initialItem, form]);

    useEffect(() => {
      if (initialItem) {
        // Do not reset the whole form here: the normalization effect above
        // prepares nested variants, sizes, shoes, and other edit fields.
        // Resetting again would silently discard that normalized state.
        form.setValue(
          "image",
          typeof initialItem.image === "string" ? initialItem.image : ""
        );
      }
    }, [initialItem, form]);

    const onSubmit = async (data) => {
      try {
        // Vendor creation goes through the same request endpoint used by the
        // legacy VendorItemRequest form. The complete form is preserved in
        // draft_item so the admin approval flow can use all submitted fields.
        const department = form.getValues("department") || null;
        const section = form.getValues("section") || null;
        const category = form.getValues("category") || null;
        const subcategory = form.getValues("subcategory") || null;
        const item_attribute = form.getValues("item_attribute") || null;
        const is_organic = form.getValues("is_organic") ?? false;
        const is_fresh_food = form.getValues("is_fresh_food") ?? false;
        const occasions = form.getValues("occasions") || [];
        const image = typeof data.image === "string" ? data.image : null;

        let submittedDraftId = draftId || null;
        if (draftEnabled) {
          const savedDraft = await saveDraftNow(data, draftMedia);
          if (!savedDraft?.draft_id) {
            throw new Error("The item draft could not be saved. The item was not submitted.");
          }
          submittedDraftId = savedDraft.draft_id;
        }

        const formattedItem = {
          name: data.name,
          description: data.description,
          price: parseFloat(data.price || 0),
          discount_price:
            data.discount_price === "" || data.discount_price == null
              ? null
              : parseFloat(data.discount_price),
          section,
          department,
          category,
          subcategory,
          item_attribute,
          in_stock: parseInt(data.in_stock || 0, 10),
          available: data.available ?? true,
          returnable: data.returnable ?? true,
          image,
          video: typeof data.video === "string" ? data.video : null,
          brand: data.brand || null,
          is_organic,
          is_fresh_food,
          occasions,
          shipping_dimension_data: data.shipping_dimension_data
            ? {
                length: parseFloat(data.shipping_dimension_data.length || 0),
                width: parseFloat(data.shipping_dimension_data.width || 0),
                height: parseFloat(data.shipping_dimension_data.height || 0),
                weight: parseFloat(data.shipping_dimension_data.weight || 0),
                unit: data.shipping_dimension_data.unit || "cm",
                weight_unit: data.shipping_dimension_data.weight_unit || "kg",
              }
            : null,
          weight:
            data.weight?.value != null
              ? { value: parseFloat(data.weight.value || 0), unit: data.weight.unit || "kg" }
              : null,
          length:
            data.length?.value != null
              ? { value: parseFloat(data.length.value || 0), unit: data.length.unit || "cm" }
              : null,
          roast_type: data.roast_type || null,
          coffee_state: data.coffee_state || null,
          manufactured_date: data.manufactured_date || null,
          expiry_date: data.expiry_date || null,
          in_offer: !!data.in_offer,
          offer:
            data.in_offer && data.offer
              ? {
                  discount_percentage: parseFloat(data.offer.discount_percentage || 0),
                  start_date: data.offer.start_date || null,
                  end_date: data.offer.end_date || null,
                }
              : null,
          kids_sizes: (data.kids_sizes || []).map(
            ({ id, age_group, size, quantity_in_stock, stock }) => ({
              ...(id ? { id } : {}),
              age_group: age_group ?? size ?? "",
              quantity_in_stock: quantity_in_stock ?? stock ?? 0,
            })
          ),
          shoe_input: (() => {
            const existingShoes = Array.isArray(data.shoe_input)
              ? data.shoe_input
              : [];
            const hasLegacyShoeFields =
              data.shoe_type ||
              data.shoe_gender ||
              (Array.isArray(data.shoe_size) && data.shoe_size.length > 0);

            if (existingShoes.length > 0 || !hasLegacyShoeFields) {
              return existingShoes.map(
                ({ id, shoe_type, shoe_gender, shoe_size }) => ({
                  ...(id ? { id } : {}),
                  shoe_type: shoe_type || "",
                  shoe_gender: shoe_gender || "",
                  shoe_size: Array.isArray(shoe_size)
                    ? shoe_size
                    : shoe_size
                      ? [shoe_size]
                      : [],
                })
              );
            }

            return [
              {
                shoe_type: data.shoe_type || "",
                shoe_gender: data.shoe_gender || "",
                shoe_size: Array.isArray(data.shoe_size)
                  ? data.shoe_size
                  : data.shoe_size
                    ? [data.shoe_size]
                    : [],
              },
            ];
          })(),
          size_only_icon: (data.size_variant || []).map(
            ({ id, size, stock, quantity_in_stock }) => ({
              ...(id ? { id } : {}),
              size,
              quantity_in_stock: quantity_in_stock ?? stock ?? 0,
            })
          ),
          variants: (data.color_variants || []).map(
            ({ id, color, sizes, color_image, image }) => ({
              ...(id ? { id } : {}),
              color,
              sizes: (sizes || []).map(
                ({ id: sizeId, size, quantity_in_stock, stock }) => ({
                  ...(sizeId ? { id: sizeId } : {}),
                  size,
                  quantity_in_stock: quantity_in_stock ?? stock ?? 0,
                })
              ),
              // JSON drafts cannot carry browser File objects.
              image:
                typeof (image ?? color_image) === "string"
                  ? image ?? color_image
                  : null,
            })
          ),
        };

        // Existing items use the same form for direct vendor/admin edits.
        // This replaces the legacy EditItem/EditItemForm submission path.
        if (isEditing && itemId && !adminCreateNew) {
          const editFormData = new FormData();
          const appendValue = (key, value) => {
            if (value === null || value === undefined || value === "") return;
            if (Array.isArray(value) || typeof value === "object") {
              editFormData.append(key, JSON.stringify(value));
            } else {
              editFormData.append(key, String(value));
            }
          };

          appendValue("name", formattedItem.name);
          appendValue("description", formattedItem.description);
          appendValue("price", formattedItem.price);
          appendValue("discount_price", formattedItem.discount_price);
          appendValue("department", formattedItem.department);
          appendValue("category", formattedItem.category);
          appendValue("subcategory", formattedItem.subcategory);
          appendValue("available", formattedItem.available);
          appendValue("returnable", formattedItem.returnable);
          appendValue("in_stock", formattedItem.in_stock);
          appendValue("section", formattedItem.section);
          appendValue("in_offer", formattedItem.in_offer);
          appendValue("offer", formattedItem.offer);
          appendValue("is_organic", formattedItem.is_organic);
          appendValue("is_fresh_food", formattedItem.is_fresh_food);
          appendValue("manufactured_date", formattedItem.manufactured_date);
          appendValue("expiry_date", formattedItem.expiry_date);
          appendValue("roast_type", formattedItem.roast_type);
          appendValue("coffee_state", formattedItem.coffee_state);
          appendValue("item_attribute", formattedItem.item_attribute);
          appendValue("shoe_input", formattedItem.shoe_input);
          appendValue("size_only_icon", formattedItem.size_only_icon);
          appendValue("kids_sizes", formattedItem.kids_sizes);
          appendValue("variants", (data.color_variants || []).map((variant, index) => ({
            ...(variant.id ? { id: variant.id } : {}),
            color: variant.color,
            sizes: (variant.sizes || []).map(({ id, size, quantity_in_stock, stock }) => ({
              ...(id ? { id } : {}),
              size,
              quantity_in_stock: quantity_in_stock ?? stock ?? 0,
            })),
            image_field: `variant_image_${index}`,
          })));
          appendValue("length", formattedItem.length);
          appendValue("weight", formattedItem.weight);
          appendValue("shipping_dimension_data", formattedItem.shipping_dimension_data);

          if (data.image instanceof File) {
            editFormData.append("image", data.image);
          }

          (data.color_variants || []).forEach((variant, index) => {
            if (variant.color_image instanceof File) {
              editFormData.append(`variant_image_${index}`, variant.color_image);
            }
          });

          const response = await api.put(
            `/api/item-post/update/${itemId}/`,
            editFormData,
            { withCredentials: true, headers: { "Content-Type": "multipart/form-data" } }
          );

          if (response.status === 200 || response.status === 201) {
            onSave(response.data);
          } else {
            throw new Error("Failed to update item.");
          }
          return;
        }

        // Admin-created items are persisted directly against the selected vendor.
        // Vendor create/edit continues through the existing vendor-request draft flow.
        if (isAdmin && adminCreateNew) {
          if (!vendor?.id) {
            throw new Error("Select a vendor before saving the item.");
          }

          const adminFormData = new FormData();
          adminFormData.append("vendor_id", String(vendor.id));
          if (submittedDraftId) adminFormData.append("draft_id", submittedDraftId);

          Object.entries(formattedItem).forEach(([key, value]) => {
            if (value === null || value === undefined || value === "") return;

            if (key === "image") {
              return;
            }

            if (Array.isArray(value) || typeof value === "object") {
              adminFormData.append(key, JSON.stringify(value));
            } else {
              adminFormData.append(key, String(value));
            }
          });

          if (data.image instanceof File) {
            adminFormData.append("image", data.image);
          }

          (data.color_variants || []).forEach((variant, index) => {
            if (variant.color_image instanceof File) {
              adminFormData.append(`variant_image_${index}`, variant.color_image);
            }
          });

          const response = await api.post(
            "/api/item-post/update/",
            adminFormData,
            {
              withCredentials: true,
              headers: { "Content-Type": "multipart/form-data" },
            }
          );

          if (response.status === 201 || response.status === 200) {
            onSave(response.data);
          } else {
            alert("Failed to create item.");
          }
          return;
        }

        const vendorFormData = new FormData();
        vendorFormData.append("name", String(formattedItem.name || ""));
        vendorFormData.append("description", String(formattedItem.description || ""));
        vendorFormData.append("price", String(formattedItem.price || 0));
        vendorFormData.append("draft_item", JSON.stringify(formattedItem));
        if (submittedDraftId) vendorFormData.append("draft_id", submittedDraftId);

        if (data.image instanceof File) {
          vendorFormData.append("image", data.image);
        }

        const response = await api.post(
          "/api/vendor/item-requests/create/",
          vendorFormData,
          {
            withCredentials: true,
            headers: { "Content-Type": "multipart/form-data" },
          }
        );

        if (response.status === 201 || response.status === 200) {
          onSave(response.data);
        } else {
          alert("Failed to submit item request.");
        }
      } catch (error) {
        console.error("Item draft save failed:", error);
        alert("Item update failed. Check console for details.");
      }
    };

  return (
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="px-2 py-2 text-foreground">
      <div className="space-y-4" >

         {/* Toggle switch (only shown when a vendor sells both organic and inorganic items) */}
      <div className='border rounded-[20px] border-gray-300 p-4'>
       {!isEditing && productType === "both" && (
        <div className="my-4 space-y-2">
          <label className="block text-sm leading-6 font-semibold text-foreground">Select Form</label>
          <div className="flex flex-wrap gap-2">
            {/* Organic */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="form-type"
                value="organic"
                checked={selectedSection === "organic"}
                onChange={() => setSelectedSection("organic")}
                className="hidden"
              />
              <span
                className={`px-2 py-2 rounded-[20px] px-3 py-2 text-sm font-medium border transition
                  ${selectedSection === "organic"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-card text-muted-foreground border-border hover:border-[#2563eb]/50"}
                `}
              >
                Organic
              </span>
            </label>

            {/* Normal */}
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="form-type"
                value="inorganic"
                checked={selectedSection === "inorganic"}
                onChange={() => setSelectedSection("inorganic")}
                className="hidden"
              />
              <span
                className={`px-2 py-2 rounded-[20px] px-3 py-2 text-sm font-medium border transition
                  ${selectedSection === "inorganic"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-card text-muted-foreground border-border hover:border-[#2563eb]/50"}
                `}
              >
                Handmade
              </span>
            </label>
          </div>
        </div>
      )}

         {/* Section (read only) */}
          <FormField
          className="relative mb-4"
          control={form.control}
          name="section"
          render={({ field }) => (
            <FormItem className='flex  flex-col'>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Section</FormLabel>
              <FormControl>
                <input
                  type="text"
                  {...field}
                  value={field.value}
                  disabled
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 text-center"
                />
              </FormControl>
              <FormDescription>
                This is set automatically based on your vendor type and cannot be edited directly.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

         {/* Department Select */}
        <FormField
          className=''
          control={control}
          name="department"
          render={({ field }) => (
            <FormItem className='px-0 m-0'>
              <FormLabel className='text-sm font-semibold text-foreground'>Department</FormLabel>
              <FormControl className='flex flex-col justify-end h-65'>
                <select
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                  {...field}
                  onChange={(e) => {
                    const dept = e.target.value;
                    setSelectedDepartment(dept);
                    setSelectedCategory("");
                    setValue("department", dept);
                    setValue("category", "");
                    setValue("subcategory", "");
                  }}
                >
                  <option  value="">
                    Select Department
                  </option>
                  {Object.keys(activeData || {}).map((dept) => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Choose the department this product belongs to. This determines which categories are available next.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Category Select */}
        {selectedDepartment && (
          <FormField
            control={control}
            name="category"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Category</FormLabel>
                <FormControl>
                  {isCustomCategory ? (
                    <Input {...field} value={field.value ?? ""} placeholder="Enter custom category"
                      onChange={(e) => { setSelectedCategory(e.target.value); field.onChange(e.target.value); }} />
                  ) : (
                    <select {...field} value={field.value ?? ""}
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                      onChange={(e) => {
                        const cat = e.target.value;
                        setSelectedCategory(cat);
                        field.onChange(cat);
                        setValue("subcategory", "");
                        setIsCustomSubcategory(false);
                      }}>
                      <option value="">Select Category</option>
                      {(activeData?.[selectedDepartment]?.categories || []).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </FormControl>
                <button type="button" className="w-fit text-sm font-medium text-[#2563eb] hover:underline"
                  onClick={() => {
                    const next = !isCustomCategory;
                    setIsCustomCategory(next);
                    setIsCustomSubcategory(false);
                    setSelectedCategory("");
                    setValue("category", "");
                    setValue("subcategory", "");
                  }}>
                  {isCustomCategory ? "Use existing category" : "Can't find your category? Add a custom category"}
                </button>
                <FormDescription>Select a category or add a custom category when it is not in the list.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Subcategory Select */}
        {selectedCategory && (
          <FormField
            control={control}
            name="subcategory"
            render={({ field }) => (
              <FormItem className="space-y-2">
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Subcategory</FormLabel>
                <FormControl>
                  {isCustomSubcategory ? (
                    <Input {...field} value={field.value ?? ""} placeholder="Enter custom subcategory" />
                  ) : (
                    <select {...field} value={field.value ?? ""}
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20">
                      <option value="">Select Subcategory</option>
                      {(activeData?.[selectedDepartment]?.subcategories?.[selectedCategory] || []).map((subcat) => (
                        <option key={subcat} value={subcat}>{subcat}</option>
                      ))}
                    </select>
                  )}
                </FormControl>
                <button type="button" className="w-fit text-sm font-medium text-[#2563eb] hover:underline"
                  onClick={() => {
                    const next = !isCustomSubcategory;
                    setIsCustomSubcategory(next);
                    setValue("subcategory", "");
                  }}>
                  {isCustomSubcategory ? "Use existing subcategory" : "Can't find your subcategory? Add a custom subcategory"}
                </button>
                <FormDescription>Select a subcategory or add a custom subcategory when it is not in the list.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
      </div>

          <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Item Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder="item name"
                />
              </FormControl>
              <FormDescription>
                Enter a clear, descriptive name for the product as it will appear to shoppers.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />


        <FormField
          control={form.control}
          name="discount_price"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Discount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="Apply a discount"
                  {...field}
                  onChange={(e) => {
                    // Ensure the value is always treated as a number (handle invalid input)
                    const value = e.target.value;
                    field.onChange(value ? parseFloat(value) : 0); // Convert to number or 0 if empty
                  }}
                />
              </FormControl>
              <FormDescription>
                Optional. Set a discounted price to show alongside the regular price.
              </FormDescription>
              <FormMessage>
                {form.formState.errors.discount_price && form.formState.errors.discount_price.message}
              </FormMessage>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="in_stock"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Qty in Stock</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={isNaN(field.value) ? "" : field.value}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    field.onChange(isNaN(val) ? "" : val);
                  }}
                  placeholder="Enter qty in stock"
                />
              </FormControl>
              <FormDescription>
                Enter the total quantity currently available for sale.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

<FormField
  control={form.control}
  name="image"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-sm leading-6 font-semibold text-foreground">Item Image</FormLabel>
      <FormControl>
      <div className="flex flex-col gap-3">
          {field.value && (
            <div className="relative h-40 w-full max-w-xs overflow-hidden rounded-[20px] border border-border bg-muted/40">
              <img
                src={
                  typeof field.value === "string"
                    ? field.value.startsWith("http")
                      ? field.value
                      : resolveApiAssetUrl(field.value)
                    : URL.createObjectURL(field.value)
                }
                alt="Item preview"
                className="h-full w-full object-contain bg-card p-2"
              />
              {typeof field.value === "string" && (
                <p className="absolute bottom-0 left-0 w-full truncate bg-black/60 px-2 py-1 text-xs text-white">
                  {field.value}
                </p>
              )}
            </div>
          )}
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                field.onChange(file);
              }
            }}
          />
        </div>
      </FormControl>
      <FormDescription>
        Upload a clear, well-lit photo of the product. This is the main image shown to shoppers.
      </FormDescription>
    </FormItem>
  )}
/>

    <FormField
      control={form.control}
      name="price"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm leading-6 font-semibold text-foreground">Price</FormLabel>
          <FormControl>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              disabled={shouldMuteProtectedFields}
              value={isNaN(field.value) ? "" : field.value}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                field.onChange(isNaN(val) ? "" : val);
              }}
              placeholder="Enter price"
            />
          </FormControl>
          <FormDescription>
                Enter the price of the product.
              </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm leading-6 font-semibold text-foreground">Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} placeholder="Item description..." />
                  </FormControl>
                  <FormDescription>
                Enter the description of the product.
              </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Product Attribute */}
            <FormField
              control={control}
              name="item_attribute"
              render={({ field }) => {
                const productType = vendor?.vendor_data?.product_type;
                const attributes =
                  selectedSection === "organic" && productType !== "inorganic"
                    ? organicAttributes
                    : selectedSection === "inorganic" && productType !== "organic"
                      ? inorganicAttributes
                      : [];
                return (
                  <FormItem>
                    <FormLabel className="text-sm leading-6 font-semibold text-foreground">Product Attribute</FormLabel>
                    <FormControl>
                      {isCustomAttribute ? (
                        <Input {...field} value={field.value ?? ""} placeholder="Enter custom attribute" />
                      ) : (
                        <select {...field} value={field.value ?? ""}
                          className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20">
                          <option value="">Select attribute</option>
                          {attributes.map((attr) => <option key={attr.value} value={attr.value}>{attr.label}</option>)}
                        </select>
                      )}
                    </FormControl>
                    <button type="button" className="w-fit text-sm font-medium text-[#2563eb] hover:underline"
                      onClick={() => {
                        const next = !isCustomAttribute;
                        setIsCustomAttribute(next);
                        if (!next && !attributes.some((attr) => attr.value === field.value)) field.onChange("");
                      }}>
                      {isCustomAttribute ? "Use predefined attribute" : "Can't find the attribute? Enter a custom attribute"}
                    </button>
                    <FormDescription>Choose a predefined attribute or enter a custom one.</FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

              {/* Occasion / Suitable For */}
              <FormField
                control={control}
                name="occasions"
                render={({ field }) => {
                  const selectedOccasions = Array.isArray(field.value) ? field.value : [];

                  const toggleOccasion = (key, checked) => {
                    if (checked) {
                      field.onChange(
                        selectedOccasions.includes(key)
                          ? selectedOccasions
                          : [...selectedOccasions, key]
                      );
                    } else {
                      field.onChange(selectedOccasions.filter((value) => value !== key));
                    }
                  };

                  return (
                    <FormItem>
                      <FormLabel className="text-sm leading-6 font-semibold text-foreground">
                        Suitable For
                      </FormLabel>
                      <FormControl>
                        <div className="grid grid-cols-2 gap-3 rounded-[20px] border border-border bg-card p-3 sm:grid-cols-3">
                          {OCCASION_OPTIONS.map((occasion) => (
                            <label
                              key={occasion.key}
                              className="flex cursor-pointer items-center gap-2 py-1 text-sm leading-6 text-foreground"
                            >
                              <Checkbox
                                checked={selectedOccasions.includes(occasion.key)}
                                onCheckedChange={(checked) => toggleOccasion(occasion.key, checked)}
                              />
                              <span>{occasion.label}</span>
                            </label>
                          ))}
                        </div>
                      </FormControl>
                      <FormDescription>
                        Select one or more occasions or settings that fit this product.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  );
                }}
              />

              {/* Organic product details */}
              {selectedSection === "organic" && (
                <div className="my-4 space-y-2 rounded-[20px] border border-border bg-card p-2">
                  <FormLabel className="text-sm leading-6 font-semibold text-foreground">
                    Product Type
                  </FormLabel>
                  <FormControl>
                    <div className="flex flex-wrap items-center gap-4">
                      <FormField
                        control={form.control}
                        name="is_organic"
                        render={({ field }) => {
                          const checked = !!field.value;

                          return (
                            <label className="flex cursor-pointer items-center gap-2 py-1 text-sm leading-6 text-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={field.onChange}
                                className="h-4 w-4 shrink-0 rounded-sm border-[#2563eb] shadow-none focus-visible:ring-0"
                              />
                              <span className="leading-5">Is Organic</span>
                            </label>
                          );
                        }}
                      />

                      <FormField
                        control={form.control}
                        name="is_fresh_food"
                        render={({ field }) => {
                          const checked = !!field.value;

                          return (
                            <label className="flex cursor-pointer items-center gap-2 py-1 text-sm leading-6 text-foreground">
                              <Checkbox
                                checked={checked}
                                onCheckedChange={field.onChange}
                                className="h-4 w-4 shrink-0 rounded-[4px] border-[#2563eb] shadow-none focus-visible:ring-0"
                              />
                              <span className="leading-5">Is Fresh Food</span>
                            </label>
                          );
                        }}
                      />
                    </div>
                  </FormControl>
                  <FormDescription>
                    These options apply to organic products only.
                  </FormDescription>
                  <FormMessage />
                </div>
              )}

        {activeData === departmentMap && (
          <>
                  {/* Size selection for clothing categories */}
                  {["Men's Clothing", "Women's Clothing"].includes(selectedCatSizes) && (
      <>
        {/* Size Variants */}
        <FormField
          control={form.control}
          name="size_variant"
          render={({ field }) => {
            const { value = [], onChange } = field;

            const handleCheckboxChange = (checked, size) => {
              if (checked) {
                // Prevent duplicate entries
                if (!value.some((v) => v.size === size)) {
                  onChange([...value, { size, stock: 1 }]);
                }
              } else {
                onChange(value.filter((v) => v.size !== size));
              }
            };

            const handleStockChange = (size, stock) => {
              onChange(
                value.map((v) =>
                  v.size === size ? { ...v, stock: parseInt(stock) || 1 } : v
                )
              );
            };

            const selectedSizes = value.map((v) => v.size);

            return (
              <FormItem>
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Sizes & Stock</FormLabel>
                <FormControl>
                  <div
                    className="grid grid-cols-3 gap-5 my-2 p-2 rounded-lg"
                  >
                    {sizeOptions.map((size) => {
                      const selected = selectedSizes.includes(size);
                      const stockValue =
                        value.find((v) => v.size === size)?.stock?.toString() || "1";

                      return (
                        <div key={size} className="flex flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Checkbox
                              id={`size-${size}`}
                              checked={selected}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(checked, size)
                              }
                            />
                            <label
                              className="text-xs mt-1"
                              htmlFor={`size-${size}`}
                            >
                              {size}
                            </label>
                          </div>
                          {selected && (
                            <Input
                              type="number"
                              min="1"
                              value={stockValue}
                              onChange={(e) =>
                                handleStockChange(size, e.target.value)
                              }
                              placeholder="Stock"
                              className="w-24 rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </FormControl>
                <FormDescription>
                  Select each size you carry and enter its available stock quantity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Length field (Optional) */}
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => {
            const { value = {}, onChange } = field;

            const handleValueChange = (val) => {
              onChange({ ...value, value: parseFloat(val) || 0 });
            };

            const handleUnitChange = (unit) => {
              onChange({ ...value, unit });
            };

            return (
              <FormItem>
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Length (Optional)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center my-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={value?.value ?? ""}
                      onChange={(e) => handleValueChange(e.target.value)}
                      placeholder="Enter length"
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 md:w-32"
                    />
                    <select
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                      value={value?.unit ?? "cm"}
                      onChange={(e) => handleUnitChange(e.target.value)}
                    >
                      <option value="cm">Centimeters</option>
                      <option value="m">Meters</option>
                      <option value="in">Inches</option>
                    </select>
                  </div>
                </FormControl>
                <FormDescription>
                  Optional. Enter the product's length and choose a unit of measurement.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </>
    )}

    {/* Weight field (only for Beauty & Personal Care) */}
    {selectedCategory === "Beauty & Personal Care" && (
      <FormField
        control={form.control}
        name="weight"
        render={({ field }) => {
          const { value = {}, onChange } = field;

          const handleValueChange = (val) => {
            onChange({ ...value, value: parseFloat(val) || 0 });
          };

          const handleUnitChange = (unit) => {
            onChange({ ...value, unit });
          };

          return (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Weight</FormLabel>
              <FormControl>
                <div className="flex gap-3 items-center my-2">
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={value?.value ?? ""}
                    onChange={(e) => handleValueChange(e.target.value)}
                    placeholder="Enter weight"
                    className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 md:w-32"
                  />

                  <select
                    className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                    value={value?.unit ?? "g"}
                    onChange={(e) => handleUnitChange(e.target.value)}
                  >
                    <option value="g">Grams</option>
                    <option value="kg">Kilograms</option>
                    <option value="ml">Milliliters</option>
                    <option value="l">Liters</option>
                    <option value="oz">Ounces</option>
                  </select>
                </div>
              </FormControl>
              <FormDescription>
                Enter the weight of the product.
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />
    )}

    {/* Shoe-specific fields */}
    {(selectedCategory === "Shoes" || selectedSubcategory === "Shoes") && (
      <>
        {/* Shoe Type Selection */}
        <FormField
          control={form.control}
          name="shoe_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Shoe Type</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                >
                  <option value="">Select Shoe Type</option>
                  {shoeTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Select the type of shoe, such as Sneakers, Sandals, Boots, or Heels.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Gender Selection */}
        <FormField
          control={form.control}
          name="shoe_gender"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Gender</FormLabel>
              <FormControl>
                <select
                  {...field}
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                >
                  <option value="">Select Gender</option>
                  {shoeGenders.map((gender) => (
                    <option key={gender} value={gender}>
                      {gender}
                    </option>
                  ))}
                </select>
              </FormControl>
              <FormDescription>
                Select which group this shoe is designed for. Choosing Children shows kids' size options below.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Size Selection Based on Gender */}
        <FormField
          control={form.control}
          name="shoe_size"
          render={({ field }) => {
            const { value = [], onChange } = field;
            const gender = form.watch("shoe_gender");

            const sizeOptions =
              gender === "Children" ? kidsSizeOptions : adultSizes;

            const handleCheckboxChange = (checked, size) => {
              if (checked) {
                onChange([...value, size]);
              } else {
                onChange(value.filter((v) => v !== size));
              }
            };

            return (
              <FormItem>
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Select Sizes</FormLabel>
                <FormControl>
                  <div className="grid grid-cols-3 gap-4 my-2">
                    {sizeOptions.map((size) => (
                      <div key={size} className="flex items-center gap-2">
                        <Checkbox
                          id={`size-${size}`}
                          checked={value.includes(size)}
                          onCheckedChange={(checked) =>
                            handleCheckboxChange(!!checked, size)
                          }
                        />
                        <label htmlFor={`size-${size}`}>{size}</label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormDescription>
                  Select all sizes this shoe is available in.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </>
    )}

            {/* Kids sizing */}
            {["Kids & Baby Wear"].includes(selectedCatChildSize) && (
      <>
        {/* Kids Sizes & Stock */}
        <FormField
          control={form.control}
          name="kids_sizes"
          render={({ field }) => {
            const { value = [], onChange } = field;

            const handleCheckboxChange = (checked, size) => {
              if (checked) {
                onChange([...value, { size, stock: 1 }]); // default stock = 1
              } else {
                onChange(value.filter((v) => v.size !== size));
              }
            };

            const handleStockChange = (size, stock) => {
              onChange(
                value.map((v) =>
                  v.size === size ? { ...v, stock: parseInt(stock) || 1 } : v
                )
              );
            };

            const selectedSizes = value.map((v) => v.size);

            return (
              <FormItem>
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Kids Sizes & Stock</FormLabel>
                <FormControl>
                  <div
                    className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 my-2"
                  >
                    {kidsSizeOptions.map((size) => {
                      const selected = selectedSizes.includes(size);
                      const stockValue =
                        value.find((v) => v.size === size)?.stock?.toString() || "1";

                      return (
                        <div key={size} className="flex flex-col gap-1">
                          <div className="flex min-w-0 items-center gap-2">
                            <Checkbox
                              id={`size-${size}`}
                              checked={selected}
                              onCheckedChange={(checked) =>
                                handleCheckboxChange(checked, size)
                              }
                            />
                            <label className="text-xs" htmlFor={`size-${size}`}>
                              {size}
                            </label>
                          </div>
                          {selected && (
                            <Input
                              type="number"
                              min="1"
                              value={stockValue ?? "0"}
                              onChange={(e) =>
                                handleStockChange(size, e.target.value)
                              }
                              placeholder="Stock"
                              className="w-24 rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </FormControl>
                <FormDescription>
                  Select each age or size group you carry and enter its available stock quantity.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />

        {/* Length field (optional) */}
        <FormField
          control={form.control}
          name="length"
          render={({ field }) => {
            const { value = {}, onChange } = field;

            const handleValueChange = (val) => {
              onChange({ ...value, value: parseFloat(val) || 0 });
            };

            const handleUnitChange = (unit) => {
              onChange({ ...value, unit });
            };

            return (
              <FormItem>
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Length (Optional)</FormLabel>
                <FormControl>
                  <div className="flex gap-3 items-center my-2">
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={value?.value ?? ""}
                      onChange={(e) => handleValueChange(e.target.value)}
                      placeholder="Enter length"
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20 md:w-32"
                    />
                    <select
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-[#2563eb] focus:ring-2 focus:ring-[#2563eb]/20"
                      value={value?.unit ?? "cm"}
                      onChange={(e) => handleUnitChange(e.target.value)}
                    >
                      <option value="cm">Centimeters</option>
                      <option value="m">Meters</option>
                      <option value="in">Inches</option>
                    </select>
                  </div>
                </FormControl>
                <FormDescription>
                  Optional. Enter the product's length and choose a unit of measurement.
                </FormDescription>
                <FormMessage />
              </FormItem>
            );
          }}
        />
      </>
    )}
    </>
    )}

            {/* Organic-only extra fields: manufactured/expiry dates, roast, weight */}
    {activeData === organicDepartmentMap && showExtraFields && (
      <>

      <FormField
      control={form.control}
      name="is_organic"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-3 rounded p-2 border">
          <FormControl>
            <input
              type="checkbox"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 border-0 shadow-none focus-visible:outline-none focus-visible:ring-0"
            />
          </FormControl>
          <FormLabel className="text-sm leading-6 font-semibold text-foreground">Is Organic?</FormLabel>
          <FormDescription>
            Check if is organic food.
          </FormDescription>
        </FormItem>
      )}
    />

    <FormField
      control={form.control}
      name="is_fresh_food"
      render={({ field }) => (
        <FormItem className="flex flex-row items-center space-x-3 rounded p-2 border">
          <FormControl>
            <input
              type="checkbox"
              checked={field.value ?? false}
              onChange={(e) => field.onChange(e.target.checked)}
              className="h-4 w-4 border-0 shadow-none focus-visible:outline-none focus-visible:ring-0"
            />
          </FormControl>
          <FormLabel className="text-sm leading-6 font-semibold text-foreground">Is Fresh Food?</FormLabel>
          <FormDescription>
            Check if is fresh food.
          </FormDescription>
        </FormItem>
      )}
    />

      {/* Coffee-specific fields */}
      {selectedSubcategory === "Coffee" && (
      <>
        {/* Roast Type */}
        <FormField
          control={form.control}
          name="roast_type"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Roast Type</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="border rounded-full p-2 w-full"
                >
                  <option value="">Select Roast Type</option>
                  <option value="light">Light Roast</option>
                  <option value="medium">Medium Roast</option>
                  <option value="dark">Dark Roast</option>
                  <option value="espresso">Espresso Roast</option>
                  <option value="decaf">Decaf</option>
                </select>
              </FormControl>
              <FormDescription>
                Choose the roast type for coffee products.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Coffee State */}
        <FormField
          control={form.control}
          name="coffee_state"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Coffee State</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value)}
                  className="border rounded-full p-2 w-full"
                >
                  <option value="">Select Coffee State</option>
                  <option value="whole_beans">Whole Beans</option>
                  <option value="ground_coarse">Ground – Coarse</option>
                  <option value="ground_medium">Ground – Medium</option>
                  <option value="ground_fine">Ground – Fine</option>
                  <option value="instant">Instant Coffee</option>
                  <option value="capsules">Capsules/Pods</option>
                </select>
              </FormControl>
              <FormDescription>
                Choose whether it's whole beans or ground, and what grind size.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    )}

      <FormField
        control={form.control}
        name="weight"
        render={({ field }) => {
          const { value = {}, onChange } = field;

          const handleValueChange = (val) => {
            onChange({ ...value, value: parseFloat(val) || 0 });
          };

          const handleUnitChange = (unit) => {
            onChange({ ...value, unit });
          };

          return (
            <FormItem>
              <FormLabel className="text-lg">Weight</FormLabel>
              <FormControl>
                <div className="flex gap-3 items-center my-2">
                  <Input
                  type="number"
                  min={1}
                  step={1}
                  value={value?.value ?? ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    handleValueChange(val === "" ? null : parseInt(val, 10));
                  }}
                  placeholder="Enter weight"
                  className="w-32"
                />

                  <select
                    className="border rounded-full p-2"
                    value={value?.unit ?? "g"}
                    onChange={(e) => handleUnitChange(e.target.value)}
                  >
                    <option value="g">Grams</option>
                    <option value="kg">Kilograms</option>
                    <option value="ml">Milliliters</option>
                    <option value="l">Liters</option>
                    <option value="oz">Ounces</option>
                  </select>
                </div>
              </FormControl>
              <FormDescription>
                Enter the weight of the product.
              </FormDescription>
              <FormMessage />
            </FormItem>
          );
        }}
      />

        {/* Manufactured Date */}
        <FormField
          control={form.control}
          name="manufactured_date"
          rules={{
            required: "Manufactured date is required",
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg">Manufactured Date</FormLabel>
              <FormControl>
              <Input
              type="date"
              {...field}
              value={field.value ?? ""}
              className="border rounded p-2"
            />

              </FormControl>
              <FormDescription>
                Select the date this product was manufactured or produced.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Expiry Date */}
        <FormField
          control={form.control}
          name="expiry_date"
          rules={{
            required: "Expiry date is required",
            validate: (value) => {
              const manufactured = form.getValues("manufactured_date");
              if (!manufactured) return true; // manufactured not set yet → skip
              return (
                new Date(value) > new Date(manufactured) ||
                "Expiry date must be later than manufactured date"
              );
            },
          }}
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-lg" >Expiry Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  className="border rounded p-2"
                />
              </FormControl>
              <FormDescription>
                Select the date this product expires. Must be later than the manufactured date.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      </>
    )}

            {/* In-offer checkbox */}
            <FormField
              control={form.control}
              name="in_offer"
              render={({ field }) => (
                <FormItem className="rounded-[20px] border border-border p-4 w-full" >
                  <div className="flex items-center gap-2">
                    <FormControl className="space-x-2">
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="border-gray-300 bg-transparent data-[state=checked]:!border-gray-500 data-[state=checked]:!bg-gray-500"
                    />
                  </FormControl>
                  <FormLabel className="text-base mt-2">Mark item as on Offer</FormLabel>
                  </div>
                  <FormDescription>
                Enable this to run a limited-time discount on this item.
              </FormDescription>
                </FormItem>
              )}
            />

            {/* Offer fields (conditionally shown if in_offer is true) */}
            {form.watch("in_offer") && (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3 mt-4">
                {/* Discount percentage */}
                <FormField
                  control={form.control}
                  name="offer.discount_percentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Discount Percentage (%)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min="1"
                          max="100"
                          placeholder="e.g. 20"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        Enter the percentage off the regular price while the offer runs.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Start date */}
                <FormField
                  control={form.control}
                  name="offer.start_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Select the date the offer begins.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* End date */}
                <FormField
                  control={form.control}
                  name="offer.end_date"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormDescription>
                        Select the date the offer ends.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}

            {/* Color variants (inorganic items only) */}
        {activeData === departmentMap && (
            <FormField
          control={form.control}
          name="color_variants"
          render={({ field }) => {
            const { value = [], onChange } = field;

            const handleColorToggle = (color) => {
              const exists = value.find((v) => v.color === color);
              if (exists) {
                onChange(value.filter((v) => v.color !== color));
              } else {
                onChange([...value, { color, color_image: null, sizes: [] }]);
              }
            };

            const handleImageUpload = (color, file) => {
              onChange(
                value.map((v) =>
                  v.color === color ? { ...v, color_image: file } : v
                )
              );
            };

            const handleSizeToggle = (color, size) => {
              onChange(
                value.map((v) =>
                  v.color === color
                    ? {
                        ...v,
                        sizes: v.sizes.some((s) => s.size === size)
                          ? v.sizes.filter((s) => s.size !== size)
                          : [...v.sizes, { size, quantity_in_stock: 0 }],
                      }
                    : v
                )
              );
            };

            const handleStockChange = (color, size, stock) => {
              onChange(
                value.map((v) =>
                  v.color === color
                    ? {
                        ...v,
                        sizes: v.sizes.map((s) =>
                          s.size === size
                            ? { ...s, quantity_in_stock: parseInt(stock) || 0 }
                            : s
                        ),
                      }
                    : v
                )
              );
            };

            const selectedColors = value.map((v) => v.color);

            return (
              <FormItem className='rounded-[20px] p-4 border border-gray-300 bg-transparent'>
                <FormLabel className="text-lg">Color Variants</FormLabel>
                <FormControl>
                  <div className="space-y-6">
                    {/* Color selection */}
                    <div
                      className="grid grid-cols-3 xxs:grid-cols-2 gap-5 my-2"
                      style={{
                        borderRadius: "10px",
                        padding: ".5em .5em",
                      }}
                    >
                      {colorOptions.map((color) => {
                        const checkboxId = `color-${color}`;
                        return (
                          <div key={color} className="flex items-center gap-2">
                            <div>
                              <Checkbox
                                id={checkboxId}
                                checked={selectedColors.includes(color)}
                                onCheckedChange={() => handleColorToggle(color)}
                              />
                            </div>
                            <div className="flex items-center gap-2">
                              <div>
                                <span
                                  className="inline-block w-3 h-3 rounded-full border"
                                  style={{ backgroundColor: colorMap[color] || "#ccc" }}
                                />
                              </div>
                            <div className='-mt-1'>
                              <label htmlFor={checkboxId} className="text-xs cursor-pointer">
                              {color}
                            </label>
                            </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Color details */}
                    {value.map((variant) => (
                      <div key={variant.color} className="space-y-4">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: colorMap[variant.color] || "#ccc" }}
                          />
                          <span className="text-sm font-medium">{variant.color}</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) =>
                              handleImageUpload(variant.color, e.target.files[0])
                            }
                            style={{
                              width: "200px",
                              padding: ".5em 1em",
                              borderRadius: "20px",
                            }}
                          />
                        </div>

                        {/* Sizes + Stock */}
                        <div className="grid grid-cols-2 gap-4">
                          {sizeOptions.map((size) => {
                            const selected = variant.sizes.find((s) => s.size === size);
                            const sizeId = `size-${variant.color}-${size}`;
                            return (
                              <div key={size} className="flex items-center gap-2">
                                <Checkbox
                                  id={sizeId}
                                  checked={!!selected}
                                  onCheckedChange={() =>
                                    handleSizeToggle(variant.color, size)
                                  }
                                />
                                <label htmlFor={sizeId} className="text-xs ">
                                  {size}
                                </label>
                                {selected && (
                                  <Input
                                    type="number"
                                    min="1"
                                    placeholder="Stock"
                                    className="w-20"
                                    value={selected?.quantity_in_stock ?? ""}
                                    onChange={(e) =>
                                      handleStockChange(
                                        variant.color,
                                        size,
                                        e.target.value
                                      )
                                    }
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormDescription>
                Select each color you carry, upload an image for it, and set stock per size.
              </FormDescription>

                {/* Optional error display */}
                {form.formState.errors.color_variants?.message && (
                  <p className="text-red-500 text-sm">
                    {form.formState.errors.color_variants.message}
                  </p>
                )}

                <FormMessage />
              </FormItem>
            );
          }}
        />
        )}

 {/* Shipping dimensions */}
 <Controller
   name="shipping_dimension_data.length"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Length</FormLabel>
       <FormControl>
         <Input type="number" min="0" step="0.01" placeholder="Length" {...field} />
       </FormControl>
       <FormDescription>Enter the packaged item's length for shipping calculations.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
   name="shipping_dimension_data.width"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Width</FormLabel>
       <FormControl>
         <Input type="number" min="0" step="0.01" placeholder="Width" {...field} />
       </FormControl>
       <FormDescription>Enter the packaged item's width for shipping calculations.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
   name="shipping_dimension_data.height"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Height</FormLabel>
       <FormControl>
         <Input type="number" min="0" step="0.01" placeholder="Height" {...field} />
       </FormControl>
       <FormDescription>Enter the packaged item's height for shipping calculations.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
   name="shipping_dimension_data.unit"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Dimension Unit</FormLabel>
       <FormControl>
         <select
           {...field}
           className="w-full appearance-none rounded-full border border-border bg-transparent px-4 py-2 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
         >
           <option value="cm">Centimeters</option>
           <option value="m">Meters</option>
           <option value="in">Inches</option>
           <option value="ft">Feet</option>
         </select>
       </FormControl>
       <FormDescription>Choose the unit used for the length, width, and height above.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
   name="shipping_dimension_data.weight"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Weight</FormLabel>
       <FormControl>
         <Input type="number" min="0" step="0.01" placeholder="Weight" {...field} />
       </FormControl>
       <FormDescription>Enter the packaged item's weight for shipping calculations.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
   name="shipping_dimension_data.weight_unit"
   control={form.control}
   render={({ field }) => (
     <FormItem>
       <FormLabel>Weight Unit</FormLabel>
       <FormControl>
         <select
           {...field}
           className="w-full appearance-none rounded-full border border-border bg-transparent px-4 py-2 text-sm text-card-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
         >
           <option value="g">Grams</option>
           <option value="kg">Kilograms</option>
           <option value="oz">Ounces</option>
           <option value="lb">Pounds</option>
         </select>
       </FormControl>
       <FormDescription>Choose the unit used for the shipping weight above.</FormDescription>
       <FormMessage />
     </FormItem>
   )}
 />

 <Controller
     name="returnable"
     control={form.control}
     defaultValue={true}
     render={({ field }) => (
       <FormControlLabel
         control={
           <Switch
             checked={!!field.value}
             onChange={(e) => field.onChange(e.target.checked)}
             sx={{
               "& .MuiSwitch-switchBase": {
                 color: "#9ca3af",
               },
               "& .MuiSwitch-switchBase.Mui-checked": {
                 color: "#d1d5db",
               },
               "& .MuiSwitch-track": {
                 backgroundColor: "#d1d5db",
                 opacity: 1,
               },
               "& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track": {
                 backgroundColor: "#2563eb",
                 opacity: 1,
               },
             }}
           />
         }
         label="Returnable"
       />
     )}
   />

            <div className="mt-10 mb-10 w-full">
              <Button
                type="submit"
                className="w-full rounded-full bg-[#2563eb] px-4 py-3 text-center text-white hover:bg-[#1d4ed8]"
              >
                Save Changes
              </Button>
            </div>
            </div>
          </form>
        </Form>
      );
    };

    export default ItemAddNew;