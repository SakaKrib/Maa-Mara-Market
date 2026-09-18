// src/api/vendorItems.js
import api from "./Api";
import { baseUrl } from "../cmponents/Constant/Constant";

const API = api.create({
  baseUrl,
  withCredentials: true,
});

// ✅ Get vendor's own items
export const getVendorItems = () => API.get("/vendor/items/");

// ✅ Create new item
export const createVendorItem = (data) =>
  API.post("/vendor/items/", data, {
    headers: { "Content-Type": "multipart/form-data" },
  });

// ✅ Update item
export const updateVendorItem = (id, data) =>
  API.put(`/vendor/items/${id}/`, data, {
    headers: { "Content-Type": "multipart/form-data" },
  });
