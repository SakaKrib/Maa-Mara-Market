import React, { useState, useEffect } from "react";
import axios from "axios";
import { baseUrl } from "../../../../cmponents/Constant/Constant";
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
import { Select, SelectItem  } from "../../../../../components/ui/select";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../theme";
import Checkbox from "../../../../../components/ui/checkbox";
import api from "../../../../Services/Api/";
import { useVendor } from "../vendorhooks";
import { organicAttributes, inorganicAttributes } from "./itemattribute";

 // adjust path as needed




  // 🧠 Department → Category → Subcategory map
  // src/constants/departmentMap.js

export const departmentMap = {
  "Fashion & Apparel": {
    categories: ["Men's Clothing", "Women's Clothing", "Kids & Baby Wear", "Shoes", "Accessories"],
    subcategories: {
      "Men's Clothing": [
        "T-Shirts", "Polos", "Dress Shirts", "Sweaters & Sweatshirts", "Hoodies & Pullovers",
        "Jackets & Coats", "Jeans", "Pants & Chinos", "Shorts", "Suits & Sport Coats",
        "Activewear", "Underwear & Socks", "Swimwear", "Big & Tall", "Accessories"
      ],
      "Women's Clothing": [
        "Dresses", "Tops & T-Shirts", "Blouses & Shirts", "Sweaters & Cardigans", "Jackets & Coats",
        "Jeans", "Pants & Leggings", "Skirts", "Shorts", "Activewear",
        "Lingerie, Sleep & Lounge", "Suits & Blazers", "Swimwear", "Maternity", "Plus Size",
        "Accessories"
      ],
      "Kids & Baby Wear": [
        "Baby Onesies", "Kids T-Shirts", "Baby Gear", "Kids’ Footwear", "Kids Accessories"
      ],
      "Shoes": [
        "Sneakers", "Sandals", "Boots", "Heels", "Flats", "Loafers", "Running Shoes"
      ],
      "Accessories": [
        "Watches", "Bags", "Jewelry", "Belts", "Sunglasses", "Scarves", "Hats", "Gloves"
      ],
    }
  },

  "Home & Living": {
    categories: ["Furniture", "Home Decor", "Kitchen & Dining", "Bedding & Bath", "Lighting"],
    subcategories: {
      Furniture: ["Sofas", "Tables", "Chairs", "Cabinets"],
      "Home Decor": ["Wall Art", "Vases", "Curtains", "Rugs", "Carpets"],
      "Kitchen & Dining": ["Cookware", "Cutlery", "Dinnerware", "Storage", "Placemats", "Saviet Holders"],
      "Bedding & Bath": ["Bedsheets", "Blankets", "Towels", "Bath Mats", "Soap Dish", "Bath Soap"],
      Lighting: ["Ceiling Lights", "Lamps", "LED Strips", "Outdoor Lights", "Lampshades"],
    },
  },

  "Beauty & Personal Care": {
    categories: ["Skincare", "Haircare", "Makeup", "Fragrances"],
    subcategories: {
      Skincare: ["Moisturizers", "Cleansers", "Serums", "Sunscreen", "Face Toner", "Body Lotions", "Face Oil"],
      Haircare: ["Shampoo", "Conditioner", "Hair Oils", "Hair Dryers"],
      Makeup: ["Foundation", "Lipstick", "Mascara", "Eyeshadow", "Lipbalm"],
      Fragrances: ["Perfume", "Body Spray", "Cologne"],
    },
  },

  "Baby, Kids & Toys": {
    categories: ["Toys & Games", "Baby Gear", "Kids' Furniture", "Educational"],
    subcategories: {
      "Toys & Games": ["Action Figures", "Board Games", "Puzzles", "Stuffed Animals"],
      "Kids' Furniture": ["Cribs", "Study Desks", "Toy Storage"],
      Educational: ["Books", "STEM Kits", "Flashcards"],
    },
  },

  Automotive: {
    categories: ["Car Accessories"],
    subcategories: {
      "Car Accessories": ["Seat Covers", "Floor Mats", "Phone Mounts"],
    },
  },

  "Sports & Outdoors": {
    categories: ["Fitness Equipment", "Outdoor Gear", "Camping & Hiking", "Sportswear"],
    subcategories: {
      "Fitness Equipment": ["Dumbbells", "Yoga Mats", "Resistance Bands"],
      "Outdoor Gear": ["Tents", "Backpacks", "Water Bottles"],
      "Camping & Hiking": ["Sleeping Bags", "Lanterns", "Hiking Boots", "Picnic Blankets"],
      Sportswear: ["Running Shoes", "Tracksuits", "Jerseys"],
    },
  },

  Pets: {
    categories: ["Pet Toys", "Grooming & Care", "Aquariums & Accessories"],
    subcategories: {
      "Pet Toys": ["Chew Toys", "Balls", "Interactive Toys"],
      "Grooming & Care": ["Shampoo", "Brushes", "Nail Clippers"],
      "Aquariums & Accessories": ["Fish Tanks", "Filters", "Decor"],
    },
  },

  "Seasonal Specials": {
    categories: ["Holiday Decor", "Back to School", "Gift Bundles"],
    subcategories: {
      "Holiday Decor": ["Christmas Lights", "Ornaments", "Wreaths"],
      "Back to School": ["Stationery", "Backpacks", "Lunch Boxes"],
      "Gift Bundles": ["Beauty Sets", "Snack Hampers"],
    },
  },
};


  //sizes
  const sizeOptions = [
    "XS", "S", "M", "L", "XL", "2XL", "3XL", "2XS", "3XS", "Oversize"
  ];

  //colors
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


  // 🟢 Organic Departments
  // src/constants/organicDepartmentMap.js

export const organicDepartmentMap = {
  "Organic Foods": {
    categories: ["Vegetables", "Fruits", "Grains & Legumes", "Proteins", "Pantry Staples"],
    subcategories: {
      Vegetables: [
        "Sukuma Wiki (Collard Greens)",
        "Spinach",
        "Tomatoes",
        "Onions",
        "Carrots",
        "Cabbage",
        "Broccoli",
        "Zucchini",
      ],
      Fruits: [
        "Bananas",
        "Apples",
        "Mangoes",
        "Berries",
        "Citrus Fruits",
        "Avocado",
        "Pineapples",
        "Papaya",
      ],
      "Grains & Legumes": ["Rice", "Maize", "Millet", "Quinoa", "Beans", "Lentils", "Green Grams (Ndengu)"],
      Proteins: ["Chicken", "Eggs", "Beef", "Fish", "Goat Meat"],
      "Pantry Staples": ["Peanut Butter", "Honey", "Cooking Oil", "Flour (Maize, Cassava, Wheat)"],
    },
  },

  "Organic Drinks": {
    categories: ["Juices", "Herbal Teas", "Coffee & Cocoa"],
    subcategories: {
      Juices: ["Fruit Juice", "Vegetable Juice"],
      "Herbal Teas": ["Green Tea", "Chamomile", "Hibiscus", "Lemongrass"],
      "Coffee & Cocoa": ["Coffee", "Chocolate", "Cocoa Powder"],
    },
  },

  "Organic Condiments & Spices": {
    categories: ["Spices", "Sauces", "Herbs"],
    subcategories: {
      Spices: ["Cinnamon", "Turmeric", "Black Pepper", "Cloves", "Coriander", "Ginger Powder"],
      Sauces: ["Tomato Sauce", "Chili Sauce", "Soy Sauce (Organic)", "Barbecue Sauce"],
      Herbs: ["Basil", "Oregano", "Rosemary", "Thyme", "Mint"],
    },
  },
};

  
  
  

const ItemUpdateForm = ({ form, vendorId, itemId }) => {
  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [colorVariants, setColorVariants] = useState([]);
  // track section when vendor has "both"
const [selectedSection, setSelectedSection] = useState("organic");
const [showExtraFields, setShowExtraFields] = useState(false);


  const vendor = useVendor();
  console.log(vendor)


  // define department and category based on vendor product type
  let activeData;

  if (vendor.vendor?.product_type === "organic") {
    activeData = organicDepartmentMap;
  } else if (vendor.vendor?.product_type === "inorganic") {
    activeData = departmentMap; // your general/inorganic map
  } else if (vendor.vendor?.product_type === "both") {
    activeData = selectedSection === "organic"
      ? organicDepartmentMap
      : departmentMap;
  }
console.log(activeData)

  const {
    control,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = form;

  const selectedCatSizes = watch("category");
  const selectedSubcategory = form.watch("subcategory") || "";
  const selectedCatChildSize = form.watch("cat_child_size"); // <-- add this
  const selectedColors = watch("color") || [];
  const selectedSizes = watch("size") || [];


  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.log("🚨 Form validation errors:", errors);

      // Example: show the first error in an alert (or toast)
      const firstErrorKey = Object.keys(errors)[0];
      const firstErrorMsg = errors[firstErrorKey]?.message;
      if (firstErrorMsg) {
        console.warn(`⚠️ ${firstErrorKey}: ${firstErrorMsg}`);
        // toast.error(firstErrorMsg);
      }
    }
  }, [errors]);
  // Update colorVariants when the form field changes
  useEffect ( () => {
    setColorVariants(watch("color_variants") || []);
  }, [watch("color_variants")]);

  // define section on selection
  // derive section automatically
  useEffect(() => {
    if (activeData === organicDepartmentMap) {
      setValue("section", "Organic");       // ✅ match DB
    } else if (activeData === departmentMap) {
      setValue("section", "Departmental");  // ✅ match DB
    }
  }, [activeData, setValue]);


  //reset form inputs when togle for both
  // 🔹 Reset the entire form when activeData changes
// 📝 Define your empty state once (outside the component or at top of component)
const emptyValues = {
  section: "",
  department: "",
  category: "",
  subcategory: "",
  item_name: "",
  itemDescription: "",
  price: 0,
  discount_price: 0,
  in_stock: 0,

  // ✅ Dropdown & attributes
  item_attribute: undefined, // or "" if you prefer string fallback
  is_food: false,
  is_organic: false,
  roast_type: "",
  coffee_state: "",

  // ✅ Images
  image: undefined,

  // ✅ Variants
  color_variants: [],
  size_variant: [],
  kids_sizes: [],
  shoe_type: "",
  shoe_gender: "",
  shoe_size: [],

  // ✅ Measurements
  length: { value: null, unit: "cm" },
  weight: { value: null, unit: "kg" },

  // ✅ Organic-specific
  manufactured_date: "",
  expiry_date: "",
};

useEffect(() => {
  if (activeData === organicDepartmentMap) {
    form.reset({
      ...emptyValues,
      section: "Organic", // ✅ override section
    });
  } else if (activeData === departmentMap) {
    form.reset({
      ...emptyValues,
      section: "Departmental", // ✅ override section
    });
    
  }
}, [activeData, form]);


// reset retrnable
useEffect(() => {
  if (item) {
    form.reset({
      // ... other fields
      returnable: item.returnable ?? true,
    });
  }
}, [item, form]);


  

// 🔹 Reset manufactured/expiry when activeData changes
useEffect(() => {
  if (activeData !== organicDepartmentMap) {
    form.setValue("manufactured_date", null);
    form.setValue("expiry_date", null);

    // Also unregister so validation doesn’t trigger
    form.unregister("manufactured_date");
    form.unregister("expiry_date");
  }
}, [activeData, form]);

  

  
  const onSubmit = async (data) => {
    try {
      console.log("🔄 Submitting item update...");
      console.log("💡 color_variants before submit:", data.color_variants);
  
      const formData = new FormData();
  
      // ✅ Basic fields
      formData.append("name", data.item_name);
      formData.append("description", data.itemDescription);
      formData.append("price", data.price.toString());
      formData.append("discount_price", (data.discount_price ?? 0).toString());
      formData.append("department", data.department);
      formData.append("category", data.category);
      formData.append("subcategory", data.subcategory);
      formData.append("available", "true");
      // ✅ New field (returnable)
      formData.append("returnable", data.returnable ? "true" : "false");
      formData.append("in_stock", (data.in_stock ?? 0).toString());
      formData.append("section", data.section);
  
       // ✅ Organic / food flags (always appended, default false if not set)
       formData.append("is_organic", data.is_organic ? "true" : "false");
       formData.append("is_fresh_food", data.is_fresh_food ? "true" : "false");
       console.log("is fresh food", data.is_fresh_food)
  
  
      // ✅ Manufactured & Expiry Dates
      if (data.manufactured_date) {
        formData.append("manufactured_date", data.manufactured_date);
      }
      if (data.expiry_date) {
        formData.append("expiry_date", data.expiry_date);
      }
  
      // ✅ Roast Type & Coffee State
      if (data.roast_type) {
        formData.append("roast_type", data.roast_type);
      }
  
      if (data.coffee_state) {
        formData.append("coffee_state", data.coffee_state);
      }
  
  
      // ✅ Attribute field
      if (data.item_attribute) {
        formData.append("item_attribute", data.item_attribute);
      }

      if (data.brand) {
        if (typeof data.brand === "number") {
          // existing brand_id
          formData.append("brand", data.brand.toString());
        } else if (typeof data.brand === "object") {
          // new brand object
          formData.append("brand", JSON.stringify({
            name: data.brand.name,
            description: data.brand.description,
          }));
          if (data.brand.logo instanceof File) {
            formData.append("brand_logo", data.brand.logo);
          }
        }}

        // ✅ Shipping Dimensions
    if (data.shipping_dimension_data) {
      formData.append("shipping_dimension_data", JSON.stringify(data.shipping_dimension_data));
    }

      
      // ✅ Offer handling
    formData.append("in_offer", data.in_offer ? "true" : "false");
    if (data.in_offer && data.offer) {
      formData.append(
        "offer_discount_percentage",
        data.offer.discount_percentage?.toString() || "0"
      );
      formData.append("offer_start_date", data.offer.start_date || "");
      formData.append("offer_end_date", data.offer.end_date || "");
    }
  
      // ✅ Shoe input
      if (data.shoe_input?.length > 0) {
        const shoePayload = data.shoe_input.map((s) => ({
          shoe_type: s.shoe_type,
          shoe_gender: s.shoe_gender,
          shoe_size: s.shoe_size, // 🔍 keep as single value unless backend expects array
        }));
        formData.append("shoe_input", JSON.stringify(shoePayload));
      }
  
      // ✅ Size Variants (size-only stock)
      const sizesPayload =
        data.size_variant?.length > 0
          ? data.size_variant.map(({ size, stock }) => ({ size, stock }))
          : [];
      formData.append("size_only_icon", JSON.stringify(sizesPayload));
  
      // ✅ Kids Sizes
      const kidsPayload =
        data.kids_sizes?.length > 0
          ? data.kids_sizes.map(({ size, stock }) => ({ size, stock }))
          : [];
      formData.append("kids_sizes", JSON.stringify(kidsPayload));
  
      // ✅ Color Variants → send as ONE JSON array
      const variantsPayload = (data.color_variants || []).map((variant, index) => ({
        color: variant.color,
        sizes: (variant.sizes || []).map(
          ({ size, quantity_in_stock, stock }) => ({
            size,
            quantity_in_stock: quantity_in_stock ?? stock ?? 0,
          })
        ),
        has_image: variant.color_image instanceof File, // marker for backend
      }));
      formData.append("variants", JSON.stringify(variantsPayload));
  
      // Attach images separately with predictable keys
      (data.color_variants || []).forEach((variant, index) => {
        if (variant.color_image instanceof File) {
          formData.append(`variant_images_${index}`, variant.color_image);
        }
      });
  
      // ✅ Main image
      if (data.image instanceof File) {
        formData.append("image", data.image);
      }
  
      // ✅ Length
      if (data.length?.value) {
        formData.append(
          "length",
          JSON.stringify({ value: data.length.value, unit: data.length.unit })
        );
      }
  
      // ✅ Weight
      if (data.weight?.value) {
        formData.append(
          "weight",
          JSON.stringify({ value: data.weight.value, unit: data.weight.unit })
        );
      }
  
      // 🔍 Debug log: check FormData contents
      console.log("📤 Final FormData payload:");
      for (let [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(key, value.name, "File");
        } else {
          console.log(key, value, typeof value);
        }
      }
  
      // ✅ API call
      const response = await api.put(
        `${baseUrl}/api/item-post/update/${itemId}/`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
  
      console.log("✅ Item update successful:", response.data);
      alert("Item updated successfully!");
    } catch (error) {
      console.error("❌ Error updating item:", error);
      if (error.response) {
        console.error("📛 Server responded with:", error.response.data);
        alert("Update failed: " + JSON.stringify(error.response.data));
      } else {
        alert("Update failed: Network error or invalid response.");
      }
    }
  };
  
    
    console.log("this is vaiant", item.variants)


  return (

    // separate
    <Form {...form}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-2 py-6">
    <div >

       {/* 🔀 Toggle switch (only for organicDepartmentMap or departmentMap) */}
     {vendor.vendor?.product_type === "both" && (
      <div className="flex items-center gap-4 my-4">
        <label className="text-sm font-medium">Select Form</label>

        <div className="flex gap-3">
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
              className={`px-4 py-2 rounded-lg text-sm font-medium border
                ${selectedSection === "organic"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-600 border-gray-300"}
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
              value="normal"
              checked={selectedSection === "normal"}
              onChange={() => setSelectedSection("normal")}
              className="hidden"
            />
            <span
              className={`px-4 py-2 rounded-lg text-sm font-medium border
                ${selectedSection === "normal"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-gray-100 text-gray-600 border-gray-300"}
              `}
            >
              Handmade
            </span>
          </label>
        </div>
      </div>
    )}

      {/* section read only */}
      <FormField
      className="relative mb-4"
      control={form.control}
      name="section"
      render={({ field }) => (
        <FormItem className='flex  flex-col'>
          <FormLabel className="text-lg ">Section</FormLabel>
          <FormControl>
            <input
              type="text"
              {...field}
              value={field.value}
              disabled
              className="rounded p-2 bg-gray-600 text-center outline-none"
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />

     {/* 🔷 Department Select */}
    <FormField
      className=''
      control={control}
      name="department"
      render={({ field }) => (
        <FormItem className='px-0 m-0'>
          <FormLabel className='text-lg'>Department</FormLabel>
          <FormControl className='flex flex-col justify-end h-65'>
            <select
              style={{ backgroundColor: colors.primary[600], padding: '.5em .5em', borderRadius: '4px' }}
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
              <option style={{ backgroundColor: colors.primary[600] }} value="">
                Select Department
              </option>
              {Object.keys(activeData || {}).map((dept) => (
                <option key={dept} value={dept}>{dept}</option>
              ))}
            </select>
          </FormControl>
          <FormDescription>
            Enter the department of the product.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* 🔷 Category Select */}
    {selectedDepartment && (
      <FormField
        control={control}
        name="category"
        render={({ field }) => (
          <FormItem className='flex flex-col justify-end h-65'>
            <FormLabel className='text-lg'>Category</FormLabel>
            <FormControl>
              <select
                style={{ backgroundColor: colors.primary[600], padding: '.5em .5em', borderRadius: '4px' }}
                {...field}
                onChange={(e) => {
                  const cat = e.target.value;
                  setSelectedCategory(cat);
                  setValue("category", cat);
                  setValue("subcategory", "");
                }}
              >
                <option style={{ backgroundColor: colors.primary[600] }} value="">
                  Select Category
                </option>
                {(activeData?.[selectedDepartment]?.categories || []).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </FormControl>
            <FormDescription>
              Enter the category of the product.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    )}

    {/* 🔷 Subcategory Select */}
    {selectedCategory && (
      <FormField
        control={control}
        name="subcategory"
        render={({ field }) => (
          <FormItem className='flex flex-col justify-end relative top-1'>
            <FormLabel className='text-lg'>Subcategory</FormLabel>
            <FormControl>
              <select
                style={{ backgroundColor: colors.primary[600], fontSize: '0.9rem', padding: '.5em .5em', borderRadius: '4px' }}
                {...field}
              >
                <option value="">Select Subcategory</option>
                {(activeData?.[selectedDepartment]?.subcategories?.[selectedCategory] || []).map((subcat) => (
                  <option
                    style={{ backgroundColor: colors.primary[600] }}
                    key={subcat}
                    value={subcat}
                  >
                    {subcat}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormDescription>
              Enter the sub-category of the product.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    )}

    




        {/* SEPARATE */}

      
        <FormField
      control={form.control}
      name="item_name"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg">Item Name</FormLabel>
          <FormControl>
            <Input
              {...field}
              value={field.value ?? ""}
              placeholder="item name"
            />
          </FormControl>
          <FormDescription>
            Enter the name of the product.
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
          <FormLabel className='text-lg'>Discount</FormLabel>
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
            Enter the discount of the product.
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
          <FormLabel className="text-lg">Qty in Stock</FormLabel>
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
            Enter the Qty in stock.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />

    {/* conditional rendering */}
    {activeData === departmentMap && (
      <>
              {/* select sizes */}
              {["Men's Clothing", "Women's Clothing"].includes(selectedCatSizes) && (
  <>
    {/* ✅ Size Variants */}
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
            <FormLabel className="text-lg">Sizes & Stock</FormLabel>
            <FormControl>
              <div
                className="grid grid-cols-3 gap-5 my-2 p-2 rounded-lg"
                style={{
                  boxShadow: `0 7px 24px ${colors.primary[400]}`
                }}
              >
                {sizeOptions.map((size) => {
                  const selected = selectedSizes.includes(size);
                  const stockValue =
                    value.find((v) => v.size === size)?.stock?.toString() || "1";

                  return (
                    <div key={size} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
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
                          className="w-20"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </FormControl>
            <FormDescription>
              Enter the sizes and stock quantities for this product.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />

    {/* ✅ Length field (Optional) */}
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
            <FormLabel className="text-lg">Length (Optional)</FormLabel>
            <FormControl>
              <div className="flex gap-3 items-center my-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={value?.value ?? ""}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Enter length"
                  className="w-32"
                />
                <select
                  className="border rounded p-2"
                  style={{color:colors.gray[100], backgroundColor:colors.primary[600]}}
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
              Select the length of the product.
            </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  </>
)}



{/* beauty and cosmetics */}
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
          <FormLabel className="text-lg">Weight</FormLabel>
          <FormControl>
            <div className="flex gap-3 items-center my-2">
              {/* Numeric input */}
              <Input
                type="number"
                min="0"
                step="0.01"
                value={value?.value ?? ""}
                onChange={(e) => handleValueChange(e.target.value)}
                placeholder="Enter weight"
                className="w-32"
              />

              {/* Dropdown for unit */}
              <select
                className="border rounded p-2 bg-white text-black"
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



{/* if shoes is selected */}
{(selectedCategory === "Shoes" || selectedSubcategory === "Shoes") && (
  <>
    {/* Shoe Type Selection */}
    <FormField
      control={form.control}
      name="shoe_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg">Shoe Type</FormLabel>
          <FormControl>
            <select
              {...field}
              className="border rounded p-2 bg-white text-black"
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
            Enter the Shoe type.
          </FormDescription>
          <FormMessage/>
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
          <FormLabel className="text-lg">Gender</FormLabel>
          <FormControl>
            <select
              {...field}
              className="border rounded p-2 bg-white text-black"
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
            Select Gender.
          </FormDescription>
          <FormMessage></FormMessage>
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
            <FormLabel className="text-lg">Select Sizes</FormLabel>
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
            Enter the size.
          </FormDescription>
            <FormMessage />
          </FormItem>
        );
      }}
    />
  </>
)}




          

        {/* for kids size  */}
        {/* select sizes */}
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
            <FormLabel className="text-lg">Kids Sizes & Stock</FormLabel>
            <FormControl>
              <div
                className="grid grid-cols-3 gap-5 my-2"
                style={{
                  boxShadow: `0 7px 24px ${colors.primary[400]}`,
                  borderRadius: "10px",
                  padding: ".5em .5em",
                }}
              >
                {kidsSizeOptions.map((size) => {
                  const selected = selectedSizes.includes(size);
                  const stockValue =
                    value.find((v) => v.size === size)?.stock?.toString() || "1";

                  return (
                    <div key={size} className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          style={{ backgroundColor: colors.primary[600] }}
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
                          className="w-20"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </FormControl>
            <FormDescription>
            Select size and qty in stock related to the product.
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
            <FormLabel className="text-lg">Length (Optional)</FormLabel>
            <FormControl>
              <div className="flex gap-3 items-center my-2">
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={value?.value ?? ""}
                  onChange={(e) => handleValueChange(e.target.value)}
                  placeholder="Enter length"
                  className="w-32"
                />
                <select
                  className="border rounded p-2"
                  style={{color:colors.gray[100], backgroundColor:colors.primary[600]}}
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
            Select the length of the product.
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


<FormField
  control={form.control}
  name="image"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-lg">Item Image</FormLabel>
      <FormControl>
        <Input
          type="file"
          accept="image/*"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              field.onChange(file); // ✅ Pass the File object to react-hook-form
            }
          }}
        />
      </FormControl>
      <FormDescription>
            Enter a valid and high quality image of the product.
      </FormDescription>
      <FormMessage />
    </FormItem>
  )}
/>





<FormField
  control={form.control}
  name="price"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-lg">Price</FormLabel>
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



        {/* Repeat for other fields like subcategory, itemName, itemDescription, etc. */}

        <FormField
          control={form.control}
          name="itemDescription"
          render={({ field }) => (
            <FormItem>
              <FormLabel className='text-lg'>Description</FormLabel>
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

        {/* attribute */}
        
        <FormField
            control={form.control}
            name="item_attribute"
            render={({ field }) => {
              // Always start with an array
              let attributes = [];

              if (vendor.vendor?.product_type === "organic") {
                attributes = organicAttributes;
              } else if (vendor.vendor?.product_type === "inorganic") {
                attributes = inorganicAttributes;
              } else if (vendor.vendor?.product_type === "both") {
                attributes =
                  selectedSection === "organic" ? organicAttributes : inorganicAttributes;
              }

              return (
                <FormItem>
                  <FormLabel className="text-lg">Product Attribute</FormLabel>
                  <FormControl>
                    <select
                      {...field}
                      value={field.value ?? ""}
                      className="w-full rounded p-2 bg-gray-600 text-white"
                    >
                      <option value="">Select attribute</option>
                      {attributes.map((attr) => (
                        <option key={attr.value} value={attr.value}>
                          {attr.label}
                        </option>
                      ))}
                    </select>
                  </FormControl>
                  <FormDescription>
                    Choose the most relevant attribute for this product.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              );
            }}
          />




        {/* expiry and manufactured dates */}

{activeData === organicDepartmentMap && showExtraFields && (
  <>

  {/* is organic check */}
  <FormField
  control={form.control}
  name="is_organic"
  render={({ field }) => (
    <FormItem className="flex flex-row items-center space-x-3 rounded p-3 border">
      <FormControl>
        <input
          type="checkbox"
          checked={field.value ?? false}
          onChange={(e) => field.onChange(e.target.checked)}
          className="w-5 h-5"
        />
      </FormControl>
      <FormLabel className="text-lg">Is Organic?</FormLabel>
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
    <FormItem className="flex flex-row items-center space-x-3 rounded p-3 border">
      <FormControl>
        <input
          type="checkbox"
          checked={field.value ?? false}
          onChange={(e) => field.onChange(e.target.checked)}
          className="w-5 h-5"
        />
      </FormControl>
      <FormLabel className="text-lg">Is Fresh Food?</FormLabel>
      <FormDescription>
        Check if is fresh food.
      </FormDescription>
    </FormItem>
  )}
/>

  {/* if cofee */}
  {selectedSubcategory === "Coffee" && (
  <>
    {/* ✅ Roast Type */}
    <FormField
      control={form.control}
      name="roast_type"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg">Roast Type</FormLabel>
          <FormControl>
            <select
              {...field}
              value={field.value ?? ""} // keeps it controlled
              onChange={(e) => field.onChange(e.target.value)}
              className="border rounded p-2 w-full"
              style={{
                color: colors.gray[100],
                backgroundColor: colors.primary[600],
              }}
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

    {/* ✅ Coffee State */}
    <FormField
      control={form.control}
      name="coffee_state"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-lg">Coffee State</FormLabel>
          <FormControl>
            <select
              {...field}
              value={field.value ?? ""} // keeps it controlled
              onChange={(e) => field.onChange(e.target.value)}
              className="border rounded p-2 w-full"
              style={{
                color: colors.gray[100],
                backgroundColor: colors.primary[600],
              }}
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
            Choose whether it’s whole beans or ground, and what grind size.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)}

  {/* weight */}
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
              {/* Numeric input */}
              <Input
              type="number"
              min={1}
              step={1}               // ✅ whole numbers only
              value={value?.value ?? ""}
              onChange={(e) => {
                const val = e.target.value;
                handleValueChange(val === "" ? null : parseInt(val, 10));
              }}
              placeholder="Enter weight"
              className="w-32"
            />


              {/* Dropdown for unit */}
              <select
                className="border rounded p-2"
                style={{color:colors.gray[100], backgroundColor:colors.primary[600]}}
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
          value={field.value ?? ""}  // 👈 fallback ensures it's always controlled
          className="border rounded p-2"
          style={{ color: colors.gray[100], backgroundColor: colors.primary[600] }}
        />

          </FormControl>
          <FormDescription>
            Enter Manufactured date.
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
              className="border rounded p-2 "
              style={{color:colors.gray[100], backgroundColor:colors.primary[600]}}
            />
          </FormControl>
          <FormDescription>
            Enter Expiry date.
          </FormDescription>
          <FormMessage />
        </FormItem>
      )}
    />
  </>
)}

        {/* PUT ITEM ON OFFRE */}
        {/* ✅ In-offer checkbox */}
        <FormField
          control={form.control}
          name="in_offer"
          render={({ field }) => (
            <FormItem className="flex items-center space-x-2">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <FormLabel className="text-base">Mark item as on Offer</FormLabel>
            </FormItem>
          )}
        />

        {/* ✅ Offer fields (conditionally shown if in_offer is true) */}
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        )}


        {/* GENERAL COLOUR */}
        {/* conditional rendering */}
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
          <FormItem>
            <FormLabel className="text-lg">Color Variants</FormLabel>
            <FormControl>
              <div className="space-y-6">
                {/* Color selection */}
                <div
                  className="grid grid-cols-3 gap-5 my-2"
                  style={{
                    boxShadow: `0 7px 24px ${colors.primary[400]}`,
                    borderRadius: "10px",
                    padding: ".5em .5em",
                  }}
                >
                  {colorOptions.map((color) => {
                    const checkboxId = `color-${color}`;
                    return (
                      <div key={color} className="flex items-center gap-2">
                        <Checkbox
                          id={checkboxId}
                          checked={selectedColors.includes(color)}
                          onCheckedChange={() => handleColorToggle(color)}
                          style={{ backgroundColor: colors.primary[600] }}
                        />
                        <span
                          className="inline-block w-3 h-3 rounded-full border"
                          style={{ backgroundColor: colorMap[color] || "#ccc" }}
                        />
                        <label htmlFor={checkboxId} className="text-xs cursor-pointer mt-2">
                          {color}
                        </label>
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
                          outline: `1px solid ${colors.gray[100]}`,
                          width: "200px",
                          padding: ".5em 1em",
                          borderRadius: "10px",
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
            Enter colors related to the product.
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

 {/* shipping dimensions */}
    {/* ✅ Shipping Dimensions */}
<Controller
  name="shipping_dimension_data.length"
  control={form.control}
  render={({ field }) => (
    <FormItem>
      <FormLabel>Length</FormLabel>
      <FormControl>
        <Input type="number" min="0" step="0.01" placeholder="Length" {...field} />
      </FormControl>
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
          className="border rounded p-2"
          style={{backgroundColor:colors.primary[500]}}
        >
          <option value="cm">Centimeters</option>
          <option value="m">Meters</option>
          <option value="in">Inches</option>
          <option value="ft">Feet</option>
        </select>
      </FormControl>
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
          className="border rounded p-2"
          style={{backgroundColor:colors.primary[500]}}
        >
          <option value="g">Grams</option>
          <option value="kg">Kilograms</option>
          <option value="oz">Ounces</option>
          <option value="lb">Pounds</option>
        </select>
      </FormControl>
      <FormMessage />
    </FormItem>
  )}
/>


<Controller
    name="returnable"
    control={form.control}
    defaultValue={true} // fallback
    render={({ field }) => (
      <FormControlLabel
        control={
          <Switch
            {...field}
            checked={!!field.value}
            onChange={(e) => field.onChange(e.target.checked)}
            color="gray"
            disabled
          />
        }
        label="Returnable"
      />
    )}
  />{/* shipping dimensions */}
  {/* ✅ Shipping Dimensions */}
<Controller
name="shipping_dimension_data.length"
control={form.control}
render={({ field }) => (
  <FormItem>
    <FormLabel>Length</FormLabel>
    <FormControl>
      <Input type="number" min="0" step="0.01" placeholder="Length" {...field} />
    </FormControl>
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
        className="border rounded p-2"
        style={{backgroundColor:colors.primary[500]}}
      >
        <option value="cm">Centimeters</option>
        <option value="m">Meters</option>
        <option value="in">Inches</option>
        <option value="ft">Feet</option>
      </select>
    </FormControl>
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
        className="border rounded p-2"
        style={{backgroundColor:colors.primary[500]}}
      >
        <option value="g">Grams</option>
        <option value="kg">Kilograms</option>
        <option value="oz">Ounces</option>
        <option value="lb">Pounds</option>
      </select>
    </FormControl>
    <FormMessage />
  </FormItem>
)}
/>


<Controller
  name="returnable"
  control={form.control}
  defaultValue={true} // fallback
  render={({ field }) => (
    <FormControlLabel
      control={
        <Switch
          {...field}
          checked={!!field.value}
          onChange={(e) => field.onChange(e.target.checked)}
          color="gray"
          disabled
        />
      }
      label="Returnable"
    />
  )}
/>

        <Button type="submit" className="bg-white text-black px-4 mb-10 mt-10 " style={{ backgroundColor:colors.gray[100]}}>
          Save Changes
        </Button>
        </div>
      </form>
    </Form>
  );
};

export default ItemUpdateForm;
