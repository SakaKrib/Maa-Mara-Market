"use client";

import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "../../../../../../components/ui/sheet";
import { ScrollArea } from "../../../../../../components/ui/scroll-area";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../theme";
import ItemAddNew from "../AddingNewItem";
import { z } from "zod";



const CreateItemformSchema = z
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

    // ✅ Shipping dimensions
    shipping_dimension_data: z
      .object({
        length: z.coerce.number().min(0, "Length must be >= 0"),
        width: z.coerce.number().min(0, "Width must be >= 0"),
        height: z.coerce.number().min(0, "Height must be >= 0"),
        weight: z.coerce.number().min(0, "Weight must be >= 0"),
        unit: z.enum(["cm", "m", "in", "ft"]).default("cm"), // adjust units as needed
        weight_unit: z.enum(["g", "kg", "oz", "lb"]),
      })
      .optional(),

      brand: z.union([
        z.number().int(),
        z.object({
          name: z.string().min(1, "Brand name is required"),
          description: z.string().optional(),
          logo: z
            .any()
            .refine(
              (file) =>
                file instanceof File ||
                typeof file === "string" ||
                typeof file === "undefined",
              { message: "Please upload a valid logo" }
            )
            .optional(),
        }),
      ]).optional(),
      

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

    in_offer: z.boolean().optional(),
    offer: z
      .object({
        discount_percentage: z
          .number()
          .min(1, "Discount must be greater than 0")
          .max(100, "Discount cannot exceed 100"),
        start_date: z.string().min(1, "Start date is required"),
        end_date: z.string().min(1, "End date is required"),
      })
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
      if (typeof data.is_organic !== "boolean") {
        ctx.addIssue({
          path: ["is_organic"],
          code: "custom",
          message: "is_organic must be explicitly true or false for organic items",
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
if (data.category === "Coffee & Cocoa" || data.subcategory === "Coffee") {
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

//offer validation
if (data.in_offer && !data.offer) {
  ctx.addIssue({
    path: ["offer"],
    code: "custom",
    message: "Offer details are required if item is in offer",
  });
}

  });



const CreateItem = ({ vendor }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const form = useForm({
    resolver: zodResolver(CreateItemformSchema),
    defaultValues: {
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
        discount_percentage: 0,
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
    

  return (
    <div className="relative flex flex-1">
      <ItemAddNew
        vendor={vendor}
        vendorId={vendor?.id}
        onSave={() => {}}
      />
    </div>
  );
};

export default CreateItem;






