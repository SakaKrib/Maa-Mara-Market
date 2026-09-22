"use client";
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../../../../components/ui/sheet";
import z from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../theme";
import { useEffect } from "react";
import { ScrollArea } from "../../../../../../components/ui/scroll-area";
import ItemAddNew from "../AddingNewItem";


// ✅ Schema definition
const formSchema = z
  .object({
    section: z.string().min(1, "Section is required"),
    department: z.string().min(1, "Department is required"),
    category: z.string().min(1, "Category is required"),
    subcategory: z.string().min(1, "Subcategory is required"),
    item_name: z.string().min(1, "Item name is required"),
    itemDescription: z.string().min(1, "Description is required"),
    price: z.number().positive("Price must be greater than 0"),
    discount_price: z.number().nonnegative().optional(),
    in_stock: z.number().nonnegative().optional(),
    item_attribute: z.string().optional(),

    in_offer: z.boolean().optional(),


    offer: z
      .object({
        discount_percentage: z.coerce.number().min(1).max(100),
        start_date: z.string(),
        end_date: z.string(),
      })
      .optional(),
    
        // ✅ Shipping dimensions
      shipping_dimension_data: z.object({
        length: z.coerce.number().min(0, "Length must be >= 0"),
        width: z.coerce.number().min(0, "Width must be >= 0"),
        height: z.coerce.number().min(0, "Height must be >= 0"),
        weight: z.coerce.number().min(0, "Weight must be >= 0"),
        unit: z.enum(["cm", "m", "in", "ft"]).default("cm"), // adjust units as needed
        weight_unit: z.enum(["g", "kg", "oz", "lb"]),
      }).optional(),

    // ✅ Image
    image: z
      .any()
      .refine((file) => file instanceof File || typeof file === "string" || typeof file === "undefined", {
        message: "Please upload a valid image",
      }),

    // ✅ Size Variants
    size_variant: z
      .array(
        z.object({
          size: z.string(),
          stock: z.number().min(1),
        })
      )
      .optional(),

    // ✅ Kids sizes
    kids_sizes: z
      .array(
        z.object({
          size: z.string(),
          stock: z.number().min(1),
        })
      )
      .optional(),

    // ✅ Shoe attributes
    shoe_type: z.string().optional(),
    shoe_gender: z.string().optional(),
    shoe_input: z
      .array(
        z.object({
          shoe_type: z.string(),
          shoe_gender: z.string(),
          shoe_size: z.string(),
        })
      )
      .optional(),



    // ✅ Color Variants
    color_variants: z
      .array(
        z.object({
          color: z.string(),
          color_image: z.any().optional(),
          sizes: z
            .array(
              z.object({
                size: z.string(),
                quantity_in_stock: z.number().min(0),
              })
            )
            .optional(),
        })
      )
      .optional(),

    // ✅ Length
    length: z
      .union([
        z.object({
          value: z.coerce.number().nonnegative("Length must be 0 or greater"),
          unit: z.enum(["cm", "m", "in"]),
        }),
        z.null(),
      ])
      .optional(),

    // ✅ Weight
    weight: z
      .union([
        z.object({
          value: z
            .preprocess((val) => {
              if (val === "" || val === undefined || val === null) {
                return null;
              }
              return Number(val);
            }, z.number().nonnegative("Weight must be 0 or greater").nullable()),
          unit: z.enum(["g", "kg", "ml", "l", "oz"]),
        }),
        z.null(),
      ])
      .optional(),
      

    // ✅ Organic-specific
    manufactured_date: z.string().optional(),
    expiry_date: z.string().optional(),
    is_fresh_food: z.boolean().optional(),
    is_organic: z.boolean().optional(),
    roast_type: z.string().optional(),
    coffee_state: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    // ✅ Organic-specific validation
    if (data.section === "Organic") {
      if (!data.manufactured_date) {
        ctx.addIssue({
          path: ["manufactured_date"],
          code: "custom",
          message: "Manufactured date is required for organic items",
        });
      }
      if (!data.expiry_date) {
        ctx.addIssue({
          path: ["expiry_date"],
          code: "custom",
          message: "Expiry date is required for organic items",
        });
      }
      if (!data.weight || !data.weight.value || !data.weight.unit) {
        ctx.addIssue({
          path: ["weight"],
          code: "custom",
          message: "Weight and unit are required for organic items",
        });
      }
      if (data.is_fresh_food !== true && data.is_fresh_food !== false) {
        ctx.addIssue({
          path: ["is_fresh_food"],
          code: "custom",
          message: "is_food is required for organic items",
        });
      }
      if (data.is_organic !== true && data.is_organic === false) {
        ctx.addIssue({
          path: ["is_organic"],
          code: "custom",
          message: "is_organic is required for organic items",
        });
      }
    }
  
    // Shoe-specific validation
    // Shoe-specific validation
if (data.category === "Shoes") {
  if (!data.shoe_type) {
    ctx.addIssue({
      path: ["shoe_type"],
      code: "custom",
      message: "Shoe type is required for Shoes",
    });
  }

  if (!data.shoe_gender) {
    ctx.addIssue({
      path: ["shoe_gender"],
      code: "custom",
      message: "Shoe gender is required for Shoes",
    });
  }

  if (!data.shoe_input || data.shoe_input.length === 0) {
    ctx.addIssue({
      path: ["shoe_input"],
      code: "custom",
      message: "At least one size must be selected for Shoes",
    });
  }
}

// ✅ Coffee-specific validation
if (data.category === "Coffee % cocoa" || data.subcategory === "Coffee") {
  if (!data.roast_type) {
    ctx.addIssue({
      path: ["roast_type"],
      code: "custom",
      message: "Roast type is required for Coffee",
    });
  }
  if (!data.coffee_state) {
    ctx.addIssue({
      path: ["coffee_state"],
      code: "custom",
      message: "Coffee state is required for Coffee",
    });
  }
  
}

 // ofer validation
 if (data.in_offer && !data.offer) {
  ctx.addIssue({
    path: ["offer"],
    code: "custom",
    message: "Offer details are required if item is in offer",
  });
}

  });
  


const EditItem = ({ vendor, item }) => {\n  if (!item?.id) return null;
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);
  console.log("this is item in edititem", item)
  // ✅ Initialize form
  const form = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: {
      shouldUnregister: false,
      section: "",
      department: "",
      category: "",
      subcategory: "",
      item_name: "",
      itemDescription: "",
      price: 0,
      discount_price: 0,
      in_stock: 0,
      item_attribute: "",
      image: "",
      size_variant: [],
      kids_sizes: [],
      shoe_type: "",
      shoe_gender: "",
      shoe_input: [],
      color_variants: [],
  
      // ✅ Dimensional fields
      length: { value: null, unit: "cm" },
      weight: { value: null, unit: "kg" },
  
      manufactured_date: "",
      expiry_date: "",
      is_fresh_food: false,
      is_organic: false,
  
      // ✅ Offers
      in_offer: false,
      offer: {
        discount_percentage: 1,
        start_date: "",
        end_date: "",
      },
  
      // ✅ Shipping Dimension (nested object)
      shipping_dimension_data: {
        length: 0,
        width: 0,
        height: 0,
        weight: 0,
        unit: "cm",        // default length/size unit
        weight_unit: "kg", // default weight unit
      },
  
      // ✅ Brand: allow either new object or ID
      brand: null, // can be brand_id or { name, logo, description }
    },
  });
  
  // ✅ Reset form when item changes
  useEffect(() => {
    if (item) {
      form.reset({
        // ✅ Basic fields
        section: item.section || "",
        department: item.department || "",
        category: item.category || "",
        subcategory: item.subcategory || "",
        item_name: item.name || "",
        itemDescription: item.description || "",
        price: item.price ? Number(item.price) : 0,
        discount_price: item.discount_price ? Number(item.discount_price) : 0,
        in_stock: item.in_stock ?? 0,
        item_attribute: item.item_attribute || "",
        image: item.image || null,
  
        // ✅ Optional/extra fields
        coffee_state: item.coffee_state || "",
        roast_type: item.roast_type || "",
  
        // ✅ Shoes (array mapping)
        shoe_type: item.shoe_input?.[0]?.shoe_type || "",
        shoe_gender: item.shoe_input?.[0]?.shoe_gender || "",
        shoe_input: (item.shoe_input || []).map((s) => ({
          shoe_type: s.shoe_type || "",
          shoe_gender: s.shoe_gender || "",
          shoe_size: s.shoe_size || "",
        })),
  
        // ✅ Arrays/variants
        size_variant: (item.size_variant || []).map((sv) => ({
          size: sv.size || "",
          stock: sv.stock ?? 0,
        })),
        kids_sizes: (item.kids_sizes || []).map((ks) => ({
          size: ks.size || "",
          stock: ks.stock ?? 0,
        })),
        color_variants: (item.variants || []).map((variant) => ({
          id: variant.id,
          color: variant.color || "",
          color_image: null,
          existingImageUrl: variant.image || null,
          sizes: (variant.sizes || []).map((s) => ({
            id: s.id,
            size: s.size || "",
            quantity_in_stock: s.quantity_in_stock ?? 0,
          })),
        })),
  
        // ✅ Handle null → object
        length: item.length
          ? {
              value: item.length.value ?? null,
              unit: item.length.unit || "cm",
            }
          : { value: null, unit: "cm" },
        weight: item.weight
          ? {
              value: item.weight.value ?? null,
              unit: item.weight.unit || "kg",
            }
          : { value: null, unit: "kg" },
  
        // ✅ Shipping dimensions
        shipping_dimension_data: item.shipping_dimension
          ? {
              length: Number(item.shipping_dimension.length) || 0,
              width: Number(item.shipping_dimension.width) || 0,
              height: Number(item.shipping_dimension.height) || 0,
              weight: Number(item.shipping_dimension.weight) || 0,
              unit: item.shipping_dimension.unit || "cm",
              weight_unit: item.shipping_dimension.weight_unit || "kg",
            }
          : {
              length: 0,
              width: 0,
              height: 0,
              weight: 0,
              unit: "cm",
              weight_unit: "kg",
            },
  
        // ✅ Organic-specific
        manufactured_date: item.manufactured_date || "",
        expiry_date: item.expiry_date || "",
        is_fresh_food: item.is_fresh_food ?? false,
        is_organic: item.is_organic ?? false,
  
        // ✅ Offer handling
        in_offer: item.in_offer ?? false,
        offer: item.offer
        ? {
            discount_percentage: item.offer.discount_percentage
              ? Number(item.offer.discount_percentage)
              : 1,  // ✅ set minimum 1
            start_date: item.offer.start_date || "",
            end_date: item.offer.end_date || "",
          }
        : {
            discount_percentage: 1, // ✅ set minimum 1
            start_date: "",
            end_date: "",
          },

      });
    }
  
    console.log("Form reset with:", form.getValues());
  }, [item, form]);
  
  



  return (
    <Sheet>
      <SheetTrigger className="text-black px-2 py-1 rounded bg-white h-fit">
        <span className="px-1 p-0 rounded">Edit Item</span>
      </SheetTrigger>
      <SheetContent
        side="right"
        style={{
          backgroundColor: colors.primary[500],
          maxHeight: "90vh",
          overflowY: "auto",
          top: "100px",
          minWidth: "500px",
          padding: "1em",
          zIndex: 100,
        }}
      >
        <ScrollArea className="h-full w-full px-4 mt-10 absolute left-2">
          <SheetHeader>
            <SheetTitle className="mb-4" style={{ color: colors.blueAccent[100] }}>
              Edit Item
            </SheetTitle>
            <SheetDescription>
              Fill in the details below to update your item.
            </SheetDescription>
          </SheetHeader>

          <div className="relative top-10">
            <ItemAddNew initialItem={item} vendorId={vendor?.id} itemId={item.id} vendor={vendor} isAdmin={Boolean(vendor?.isAdmin || vendor?.is_admin)} onSave={() => {}} />
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};

export default EditItem;
