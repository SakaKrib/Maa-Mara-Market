import React, { useState } from "react";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../Constant/Constant";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useTheme } from "@mui/material";
import { tokens } from "../../../../../theme";

// ✅ Fixed Zod schema for validation
const requestSchema = z.object({
  name: z.string().min(2, "Name is required"),
  description: z
    .string()
    .min(10, "Description should be at least 10 characters"),
  price: z.coerce.number().positive("Price must be greater than 0"),
  image: z
    .any()
    .refine((files) => files && files.length > 0, {
      message: "Image is required",
    }),
});

function VendorItemRequestForm() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(requestSchema),
  });

  const theme = useTheme();
  const colors = tokens(theme.palette.mode);

  // ✅ Preview state
  const [preview, setPreview] = useState(null);

  // ✅ handle submit
  const onSubmit = async (data) => {
    const formData = new FormData();
    formData.append("name", data.name);
    formData.append("description", data.description);
    formData.append("price", data.price);
    formData.append("image", data.image[0]); // FileList → first File

    try {
      await api.post(`${baseUrl}/api/vendor/item-requests/create/`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      alert("✅ Item request submitted for approval!");
      reset();
      setPreview(null);
    } catch (err) {
      console.error("❌ Error submitting request:", err.response?.data || err);
      alert("Error submitting request");
    }
  };

  // ✅ Handle file change & preview
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPreview(URL.createObjectURL(file));
    } else {
      setPreview(null);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Item Name */}
      <div>
        <label className="block font-medium">Item Name</label>
        <input
          type="text"
          {...register("name")}
          className="border rounded p-2 w-full"
          style={{ backgroundColor: colors.primary[500] }}
        />
        {errors.name && (
          <p className="text-red-500 text-sm">{errors.name.message}</p>
        )}
      </div>

      {/* Description */}
      <div>
        <label className="block font-medium">Description</label>
        <textarea
          {...register("description")}
          className="border rounded p-2 w-full"
          style={{ backgroundColor: colors.primary[500] }}
        />
        {errors.description && (
          <p className="text-red-500 text-sm">{errors.description.message}</p>
        )}
      </div>

      {/* Price */}
      <div>
        <label className="block font-medium">Price</label>
        <input
          type="number"
          step="0.01"
          {...register("price")}
          className="border rounded p-2 w-full"
          style={{ backgroundColor: colors.primary[500] }}
        />
        {errors.price && (
          <p className="text-red-500 text-sm">{errors.price.message}</p>
        )}
      </div>

      {/* Image */}
      <div>
        <label className="block font-medium">Image</label>
        <input
          type="file"
          accept="image/*"
          {...register("image")}
          onChange={handleImageChange}
          className="w-full"
        />
        {errors.image && (
          <p className="text-red-500 text-sm">{errors.image.message}</p>
        )}

        {/* ✅ Preview selected image */}
        {preview && (
          <img
            src={preview}
            alt="Preview"
            className="mt-2 w-40 h-40 object-cover rounded-md border"
          />
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        className="text-white px-4 py-2 rounded"
        style={{ backgroundColor: colors.greenAccent[500] }}
      >
        Submit Request
      </button>
    </form>
  );
}

export default VendorItemRequestForm;

