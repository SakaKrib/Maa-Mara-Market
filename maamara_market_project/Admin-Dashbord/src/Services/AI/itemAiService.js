import api from "../Api";

export const generateItemWithAI = async ({ field, image, context = {} }) => {
  if (!(image instanceof File)) {
    throw new Error("Upload a product image before using AI generation.");
  }

  const formData = new FormData();
  formData.append("field", field);
  formData.append("image", image);
  formData.append("context", JSON.stringify(context));

  const response = await api.post("/api/ai/generate-item/", formData);
  return response.data;
};
