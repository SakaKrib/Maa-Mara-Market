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
import Checkbox from "../../../../../components/ui/checkbox";
import api, { resolveApiAssetUrl } from "../../../../Services/Api/";
import { useForm } from "react-hook-form";
import { organicAttributes, inorganicAttributes } from "./itemattribute";
import { Controller } from "react-hook-form";
import { useDepartments } from "./useDepartments";

 // adjust path as needed




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
  
  
const ItemAddNew = ({ initialItem, vendorId, itemId, onSave, vendor }) => {
  const { departmentMap, organicDepartmentMap } = useDepartments();
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [isCustomCategory, setIsCustomCategory] = useState(false);
  const [isCustomSubcategory, setIsCustomSubcategory] = useState(false);
  const [colorVariants, setColorVariants] = useState([]);

  const [selectedSection, setSelectedSection] = useState(
    initialItem?.section === "inorganic" ? "inorganic" : "organic"
  );
  const [showExtraFields, setShowExtraFields] = useState(false);


  

 
    const form = useForm({
      defaultValues: initialItem || {},
      mode: "onChange",
    });

    //initialize the data
    useEffect(() => {
      if (!initialItem) return;
      form.reset({
        ...initialItem,
        image: initialItem.image || "",
        section: initialItem.section || "",
      });
      setSelectedDepartment(initialItem.department || "");
      setSelectedCategory(initialItem.category || "");
      setIsCustomCategory(false);
      setIsCustomSubcategory(false);
      setSelectedSection(initialItem.section === "inorganic" ? "inorganic" : "organic");
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

 // define department and category based on vendor product type
 const [activeData, setActiveData] = useState(null);

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
    setValue("section", "organic");
  } 
  else if (productType === "inorganic") {
    setActiveData(departmentMap);
    setValue("section", "inorganic");
  } 
  else if (productType === "both") {
    const selectedMap =
      selectedSection === "organic"
        ? organicDepartmentMap
        : departmentMap;

    setActiveData(selectedMap);
    setValue(
      "section",
      selectedSection === "organic" ? "organic" : "inorganic"
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
   if (initialItem) return;
   if (activeData === organicDepartmentMap) {
     form.reset({ ...emptyValues, section: "organic" });
   } else if (activeData === departmentMap) {
     form.reset({ ...emptyValues, section: "general" });
   }
 }, [activeData, form, initialItem]);
 
 
   
 
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
      if (initialItem) {
        form.reset({
          // ... other fields
          returnable: initialItem.returnable ?? true,
        });
      }
    }, [initialItem, form]);


    useEffect(() => {
      if (initialItem) {
        form.reset({
          ...initialItem,
          image:
            typeof initialItem.image === "string"
              ? initialItem.image
              : "", // make sure it's either a string (URL) or empty
        });
      }
    }, [initialItem, form]);
    
    
   

    const onSubmit = async (data) => {
      try {
    
        // Determine the correct vendor request ID
        const vendorRequestId = data.id || vendorId || itemId;
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
        const response = await api.put(
          `${baseUrl}/api/vendor-requests/${vendorRequestId}/update-item-list/`,
          { item_list: [formattedItem] },
          { withCredentials: true }
        );
    
        if (response.status === 200) {
          onSave(response.data);
        } else {
          alert("Failed to update item.");
        }
      } catch (error) {
        
        alert("Item update failed. Check console for details.");
      }
    };
    
    
  
  
  
  
  

  return (
  
      // separate
      <Form {...form}>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 px-2 py-2 text-foreground">
      <div >

        
  
         {/* 🔀 Toggle switch (only for organicDepartmentMap or departmentMap) */}
       {vendor.vendor_data?.product_type === "both" && (
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
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"}
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
                  ${selectedSection === "normal"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-card text-muted-foreground border-border hover:border-primary/50"}
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
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Section</FormLabel>
              <FormControl>
                <input
                  type="text"
                  {...field}
                  value={field.value}
                  disabled
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 text-center"
                  
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
              <FormLabel className='text-sm font-semibold text-foreground'>Department</FormLabel>
              <FormControl className='flex flex-col justify-end h-65'>
                <select
                  className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
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
              <FormItem className="space-y-2">
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Category</FormLabel>
                <FormControl>
                  {isCustomCategory ? (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Enter custom category"
                      onChange={(e) => {
                        setSelectedCategory(e.target.value);
                        field.onChange(e.target.value);
                      }}
                    />
                  ) : (
                    <select
                      {...field}
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const cat = e.target.value;
                        setSelectedCategory(cat);
                        field.onChange(cat);
                        setValue("subcategory", "");
                        setIsCustomSubcategory(false);
                      }}
                    >
                      <option value="">Select Category</option>
                      {(activeData?.[selectedDepartment]?.categories || []).map((cat) => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  )}
                </FormControl>
                <button
                  type="button"
                  className="w-fit text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const next = !isCustomCategory;
                    setIsCustomCategory(next);
                    setIsCustomSubcategory(false);
                    setSelectedCategory("");
                    setValue("category", "");
                    setValue("subcategory", "");
                  }}
                >
                  {isCustomCategory ? "Use existing category" : "Can't find your category? Add a custom category"}
                </button>
                <FormDescription>
                  Select a category or add a custom category when it is not in the list.
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
              <FormItem className="space-y-2">
                <FormLabel className="text-sm leading-6 font-semibold text-foreground">Subcategory</FormLabel>
                <FormControl>
                  {isCustomSubcategory ? (
                    <Input
                      {...field}
                      value={field.value ?? ""}
                      placeholder="Enter custom subcategory"
                    />
                  ) : (
                    <select
                      {...field}
                      className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                      value={field.value ?? ""}
                    >
                      <option value="">Select Subcategory</option>
                      {(activeData?.[selectedDepartment]?.subcategories?.[selectedCategory] || []).map((subcat) => (
                        <option key={subcat} value={subcat}>{subcat}</option>
                      ))}
                    </select>
                  )}
                </FormControl>
                <button
                  type="button"
                  className="w-fit text-sm font-medium text-primary hover:underline"
                  onClick={() => {
                    const next = !isCustomSubcategory;
                    setIsCustomSubcategory(next);
                    setValue("subcategory", "");
                  }}
                >
                  {isCustomSubcategory ? "Use existing subcategory" : "Can't find your subcategory? Add a custom subcategory"}
                </button>
                <FormDescription>
                  Select a subcategory or add a custom subcategory when it is not in the list.
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
              <FormLabel className="text-sm leading-6 font-semibold text-foreground">Item Name</FormLabel>
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
              {/* 📝 Show clean image path if it's a string */}
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
    
            {/* attribute */}
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
                const isCustomAttribute =
                  !!field.value && !attributes.some((attr) => attr.value === field.value);

                return (
                  <FormItem>
                    <FormLabel className="text-sm leading-6 font-semibold text-foreground">
                      Product Attribute
                    </FormLabel>
                    <FormControl>
                      {isCustomAttribute ? (
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="Enter custom attribute"
                        />
                      ) : (
                        <select
                          {...field}
                          value={field.value ?? ""}
                          className="w-full rounded-[20px] border border-border bg-card px-2 py-2 text-sm leading-6 text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
                        >
                          <option value="">Select attribute</option>
                          {attributes.map((attr) => (
                            <option key={attr.value} value={attr.value}>
                              {attr.label}
                            </option>
                          ))}
                        </select>
                      )}
                    </FormControl>
                    <button
                      type="button"
                      className="w-fit text-sm font-medium text-primary hover:underline"
                      onClick={() => field.onChange("")}
                    >
                      {isCustomAttribute ? "Use predefined attribute" : "Can't find the attribute? Enter a custom attribute"}
                    </button>
                    {isCustomAttribute && (
                      <Input
                        value={field.value ?? ""}
                        onChange={(e) => field.onChange(e.target.value)}
                        placeholder="Enter custom attribute"
                      />
                    )}
                    <FormDescription>
                      Choose a predefined attribute or enter a custom one.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />
    
 