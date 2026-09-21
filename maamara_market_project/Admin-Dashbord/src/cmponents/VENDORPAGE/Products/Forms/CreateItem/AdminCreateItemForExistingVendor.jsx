import React, { useState, useEffect } from "react";
import {
    Form,
    FormField,
    FormItem,
    FormLabel,
    FormControl,
    FormMessage,
    FormDescription,
    
  } from "../../../../../../components/ui/form";
  import { Input } from "../../../../../../components/ui/input";
  import { Textarea } from "../../../../../../components/ui/textarea";
  import { Button } from "../../../../../../components/ui/button";
import Checkbox from "../../../../../../components/ui/checkbox";
import api from "../../../../../Services/Api/";
import { useForm } from "react-hook-form";
import { organicAttributes, inorganicAttributes } from "../itemattribute";
import { Controller } from "react-hook-form";
import { Snackbar, Alert } from "@mui/material";


 // adjust path as needed




  // 🧠 Department → Category → Subcategory map
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
  
  
  
  

const AdminCreateExistingVendorItems = ({ initialItem, vendorId, itemId, onSave, vendor }) => {
  console.log('this is id', initialItem?.id)

  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [colorVariants, setColorVariants] = useState([]);

  const [selectedSection, setSelectedSection] = useState("organic");
  const [showExtraFields, setShowExtraFields] = useState(false);


  

 
  const form = useForm({
    defaultValues: {
      name: initialItem?.name ?? "",
      description: initialItem?.description ?? "",
      price: initialItem?.price ?? "",
      discount_price: "",
      in_stock: 0,
      image: initialItem?.image ?? "",
      returnable: true,
      section: "",
      department: "",
      category: "",
      subcategory: "",
    },
    mode: "onChange",
  });

    //initialize the data
    // useEffect(() => {
    //   console.log("New initialItem received:", initialItem);
    //   if (initialItem) form.reset(initialItem);
    // }, [initialItem]);
    

    // innitialize item
  
    
  
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

 // define department and category based on vendor product type
 const [activeData, setActiveData] = useState(null);

 const [snackbar, setSnackbar] = useState({
    open: false,
    message: "",
    severity: "info", // success | error | warning | info
  });

  const showSnackbar = (message, severity = "info") => {
    setSnackbar({
      open: true,
      message,
      severity,
    });
  };

//  gett vendor data
const getProductType = (vendor) => {
  return (
    vendor?.product_type ||
    vendor?.vendor_data?.product_type ||
    null
  );
};

useEffect(() => {
  const productType = getProductType(vendor);

  if (!productType) return;

  if (productType === "organic") {
    setActiveData(organicDepartmentMap);
    setValue("section", "Organic");
  } 
  else if (productType === "inorganic") {
    setActiveData(departmentMap);
    setValue("section", "Departmental");
  } 
  else if (productType === "both") {
    const selectedMap =
      selectedSection === "organic"
        ? organicDepartmentMap
        : departmentMap;

    setActiveData(selectedMap);
    setValue(
      "section",
      selectedSection === "organic" ? "Organic" : "Departmental"
    );
  }
}, [vendor, selectedSection, setValue]);
 
 
   //reset form inputs when togle for both
   // 🔹 Reset the entire form when activeData changes
 // 📝 Define your empty state once (outside the component or at top of component)
 const emptyValues = {
   
 
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
       section: "organic", // ✅ override section
     });
   } else if (activeData === departmentMap) {
     form.reset({
       ...emptyValues,
       section: "general", // ✅ override section
     });
     
   }
 }, [activeData, form]);
 
 
   
 
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

    // Update returnable

    useEffect(() => {
        if (!initialItem?.name) return;
      
        form.reset({
            name: initialItem?.name ?? "",
            description: initialItem?.description ?? "",
            price: initialItem?.price ?? "",
            image: typeof initialItem?.image === "string" ? initialItem.image : "",
            returnable: true,
            section: "",
            department: "",
            category: "",
            subcategory: "",
          });
      }, [initialItem]);
    
    
   

    const onSubmit = async (data) => {

    //   e?.target?.querySelector('button[type="submit"]')?.blur();

      try {
        console.log("🧠 Preparing item data for vendor approval...", data);
    
        // Determine the correct vendor request ID
        const vendorRequestId = initialItem?.id || vendorId || itemId;
        if (!vendorRequestId) {
          throw new Error("❌ Vendor request ID is missing. Cannot update.");
        }
    
        // Always read the latest values from the form
        const department = form.getValues("department") || null;
        const section = form.getValues("section") || null;
        const category = form.getValues("category") || null;
        const subcategory = form.getValues("subcategory") || null;
        const item_attribute = form.getValues("item_attribute") || null; // ✅ added
        const is_organic = form.getValues("is_organic") ?? false; // ✅ add boolean
        const is_fresh_food = form.getValues("is_fresh_food") ?? false; // ✅ add boolean

    
        // Build cleaned item object
        const formattedItem = {
          name: data.name,
          description: data.description, // lowercase, matches model
          price: parseFloat(data.price || 0),
          discount_price: parseFloat(data.discount_price || 0),
          section,
          department,
          category,
          subcategory,
          item_attribute,
          in_stock: parseInt(data.in_stock || 0),
          available: data.available ?? true,
          returnable: data.returnable ?? true,
          image: data.image ?? null,
          brand: data.brand || null,

          // ✅ Add boolean fields here
          is_organic,
          is_fresh_food,
    
          shipping_dimension: data.shipping_dimension_data
            ? {
                length: parseFloat(data.shipping_dimension_data.length || 0),
                width: parseFloat(data.shipping_dimension_data.width || 0),
                height: parseFloat(data.shipping_dimension_data.height || 0),
                weight: parseFloat(data.shipping_dimension_data.weight || 0),
                unit: data.shipping_dimension_data.unit || "cm",
                weight_unit: data.shipping_dimension_data.weight_unit || "kg",
              }
            : null,
    
          size_variant: (data.size_variant || []).map(({ size, stock }) => ({
            size,
            quantity_in_stock: stock,
          })),
    
          colors: (data.color_variants || []).map((variant) => variant.color),
    
          color_variants: (data.color_variants || []).map(
            ({ color, sizes, color_image }) => ({
              color,
              sizes: (sizes || []).map(({ size, quantity_in_stock, stock }) => ({
                size,
                quantity_in_stock: quantity_in_stock ?? stock ?? 0,
              })),
              color_image,
            })
          ),
        };
    
       
    
        // API call
        const response = await api.patch(
            `/api/vendor-item-create-requests/${initialItem.id}/save-draft/`,
            {
              draft_item: formattedItem,
            },
            { withCredentials: true }
          );
    
        if (response.status === 200) {
          
            showSnackbar("Item draft saved successfully", "success");
            onSave?.(response.data);
        } else {
            showSnackbar("Failed to update item", "error");
        }
      } catch (error) {
        console.error("❌ Error updating item:", error);
        showSnackbar("Item update failed", "error");
      }
    };
    
    
  
  
  
  
  

  return (
  
      // separate
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-2 py-6 custom-scroll-form">
      <div >

        
  
         {/* 🔀 Toggle switch (only for organicDepartmentMap or departmentMap) */}
       {vendor.vendor_data?.product_type === "both" && (
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
                  className="rounded p-2  text-center outline-none"
                  
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
                    
                    {...field}
                    onChange={(e) => {
                      const cat = e.target.value;
                      setSelectedCategory(cat);
                      setValue("category", cat);
                      setValue("subcategory", "");
                    }}
                  >
                    <option  value="">
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
                    
                    {...field}
                  >
                    <option value="">Select Subcategory</option>
                    {(activeData?.[selectedDepartment]?.subcategories?.[selectedCategory] || []).map((subcat) => (
                      <option
                        
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-sm font-semibold text-card-foreground">Item Name</FormLabel>
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Qty in Stock</FormLabel>
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

<FormField
  control={form.control}
  name="image"
  render={({ field }) => (
    <FormItem>
      <FormLabel className="text-sm font-semibold text-card-foreground">Item Image</FormLabel>
      <FormControl>
      <div className="flex flex-col gap-3">
          {field.value && (
            <div className="relative w-32 h-32 border rounded-lg overflow-hidden">
              <img
                src={
                  typeof field.value === "string"
                    ? field.value.startsWith("http")
                      ? field.value
                      : `${baseUrl.replace(/\/$/, "")}/media/${field.value.replace(/^\/+/, "")}`
                    : URL.createObjectURL(field.value)
                }
                alt="Item preview"
                className="object-cover w-full h-full"
              />
              {/* 📝 Show clean image path if it's a string */}
              {typeof field.value === "string" && (
                <p className="absolute bottom-0 left-0 w-full bg-black/60 text-white text-xs truncate px-1">
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
    </FormItem>
  )}
/>

    
    
    
    
    
    <FormField
      control={form.control}
      name="price"
      render={({ field }) => (
        <FormItem>
          <FormLabel className="text-sm font-semibold text-card-foreground">Price</FormLabel>
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
              name="description"
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
    
                  if (vendor.vendor_data?.product_type === "organic") {
                    attributes = organicAttributes;
                  } else if (vendor.vendor_data?.product_type === "inorganic") {
                    attributes = inorganicAttributes;
                  } else if (vendor.vendor_data?.product_type === "both") {
                    attributes =
                      selectedSection === "organic" ? organicAttributes : inorganicAttributes;

                      console.log("this are attributes", attributes)
                  }
    
                  return (
                    <FormItem>
                      <FormLabel className="text-sm font-semibold text-card-foreground">Product Attribute</FormLabel>
                      <FormControl>
                        <select
                          {...field}
                          value={field.value ?? ""}
                          className="w-full rounded p-2"
                          
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


              {/* Organic inorganic */}
              <div className="my-4">
  <FormLabel className="text-sm font-semibold text-card-foreground">Product Type</FormLabel>
  <FormControl>
    <div className="flex gap-4">

      {/* Organic */}
      <FormField
        control={form.control}
        name="is_organic"
        render={({ field }) => {
          const vendorType = vendor?.vendor_data?.product_type;

          const checked = vendorType === "organic" ? true : field.value ?? false;
          const disabled = vendorType === "inorganic";

          return (
            <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input
                type="checkbox"
                {...field}
                checked={checked}
                disabled={disabled}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
              <span>Organic</span>
            </label>
          );
        }}
      />

      {/* Fresh Food */}
      <FormField
        control={form.control}
        name="is_fresh_food"
        render={({ field }) => {
          const vendorType = vendor?.vendor_data?.product_type;

          const checked = vendorType === "organic" ? true : field.value ?? false;
          const disabled = vendorType === "inorganic";

          return (
            <label className={`flex items-center gap-2 cursor-pointer ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}>
              <input
                type="checkbox"
                {...field}
                checked={checked}
                disabled={disabled}
                onChange={(e) => field.onChange(e.target.checked)}
                className="h-4 w-4"
              />
              <span>Fresh Food</span>
            </label>
          );
        }}
      />

    </div>
  </FormControl>
  <FormDescription>
    Organic: both auto-checked; Inorganic: both disabled; Both: user can select either.
  </FormDescription>
  <FormMessage />
</div>    
    
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Sizes & Stock</FormLabel>
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Length (Optional)</FormLabel>
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
                      className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Weight</FormLabel>
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Shoe Type</FormLabel>
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Gender</FormLabel>
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Select Sizes</FormLabel>
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Kids Sizes & Stock</FormLabel>
                <FormControl>
                  <div
                    className="grid grid-cols-3 gap-5 my-2"
                    
                  >
                    {kidsSizeOptions.map((size) => {
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Length (Optional)</FormLabel>
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
                      className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      
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
          <FormLabel className="text-sm font-semibold text-card-foreground">Is Organic?</FormLabel>
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
          <FormLabel className="text-sm font-semibold text-card-foreground">Is Fresh Food?</FormLabel>
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Roast Type</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ?? ""} // keeps it controlled
                  onChange={(e) => field.onChange(e.target.value)}
                  className="border rounded p-2 w-full"
                  
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Coffee State</FormLabel>
              <FormControl>
                <select
                  {...field}
                  value={field.value ?? ""} // keeps it controlled
                  onChange={(e) => field.onChange(e.target.value)}
                  className="border rounded p-2 w-full"
                  
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Weight</FormLabel>
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
                    className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                    
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
              <FormLabel className="text-sm font-semibold text-card-foreground">Manufactured Date</FormLabel>
              <FormControl>
              <Input
              type="date"
              {...field}
              value={field.value ?? ""}  // 👈 fallback ensures it's always controlled
              className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
              
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
              <FormLabel className="text-sm font-semibold text-card-foreground" >Expiry Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  
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
                      <FormLabel className="text-sm font-semibold text-card-foreground">Discount Percentage (%)</FormLabel>
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
                      <FormLabel className="text-sm font-semibold text-card-foreground">Start Date</FormLabel>
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
                      <FormLabel className="text-sm font-semibold text-card-foreground">End Date</FormLabel>
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
                <FormLabel className="text-sm font-semibold text-card-foreground">Color Variants</FormLabel>
                <FormControl>
                  <div className="space-y-6">
                    {/* Color selection */}
                    <div
                      className="grid grid-cols-3 gap-5 my-2"
                      
                    >
                      {colorOptions.map((color) => {
                        const checkboxId = `color-${color}`;
                        return (
                          <div key={color} className="flex items-center gap-2">
                            <Checkbox
                              id={checkboxId}
                              checked={selectedColors.includes(color)}
                              onCheckedChange={() => handleColorToggle(color)}
                              
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Length</FormLabel>
       <FormControl>
       <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Length"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            />
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Width</FormLabel>
       <FormControl>
       <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Width"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            />
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Height</FormLabel>
       <FormControl>
         <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Height"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            />
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Dimension Unit</FormLabel>
       <FormControl>
         <select
           {...field}
           className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
           
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Weight</FormLabel>
       <FormControl>
       <Input
            type="number"
            min="0"
            step="0.01"
            placeholder="Weight"
            value={field.value ?? ""}
            onChange={(e) => field.onChange(e.target.value)}
            />
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
       <FormLabel className="text-sm font-semibold text-card-foreground">Weight Unit</FormLabel>
       <FormControl>
         <select
           {...field}
           className="w-full rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
           
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
     defaultValue={true}
     render={({ field }) => (
       <label className="flex items-center gap-3 rounded-[20px] border border-border bg-card px-3 py-2 text-sm text-foreground">
         <input
           type="checkbox"
           checked={!!field.value}
           onChange={(e) => field.onChange(e.target.checked)}
           className="h-4 w-4 accent-primary"
         />
         <span>Returnable</span>
       </label>
     )}
   />
        
    
    
            <Button type="submit" className=" px-4 mb-10 mt-10 " >
              Save Changes
            </Button>
            </div>
          </form>
          {/* SNACKBAR */}
      {/* SNACKBAR */}
      <Snackbar
    open={snackbar.open}
    autoHideDuration={3000}
    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
    anchorOrigin={{ vertical: "top", horizontal: "right" }}
    >
    <Alert
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        severity={snackbar.severity}
        variant="filled"
        sx={{ width: "100%" }}
    >
        {snackbar.message}
    </Alert>
    </Snackbar>
        </Form>
      );
    };
    
    export default AdminCreateExistingVendorItems;
    