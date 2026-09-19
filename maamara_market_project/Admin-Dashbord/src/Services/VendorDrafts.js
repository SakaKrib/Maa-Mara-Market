import api from "./Api";

export const getVendorDraft = async () => {
  const { data } = await api.get("/api/vendor-draft/", {
    withCredentials: true,
  });
  return data;
};

export const saveVendorDraft = async (formData) => {
  const { data } = await api.post("/api/vendor-draft/", formData, {
    withCredentials: true,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
  return data;
};

export const deleteVendorDraft = async () => {
  const { data } = await api.delete("/api/vendor-draft/", {
    withCredentials: true,
  });
  return data;
};
