import api, { resolveApiAssetUrl } from "../Api";

const toImageFile = async (image) => {
  if (image instanceof File) {
    return image;
  }

  if (image instanceof Blob) {
    return new File([image], "product-image", {
      type: image.type || "image/jpeg",
    });
  }

  if (typeof image === "string" && image.trim()) {
    const imageUrl = resolveApiAssetUrl(image.trim());
    const response = await api.get(imageUrl, { responseType: "blob" });
    const contentType = response.data.type || "image/jpeg";
    const extension = contentType.split("/")[1] || "jpeg";

    return new File([response.data], `product-image.${extension}`, {
      type: contentType,
    });
  }

  throw new Error("Upload a product image before using AI generation.");
};

export const generateItemWithAI = async ({ field, image, context = {} }) => {
  const imageFile = await toImageFile(image);

  const formData = new FormData();
  formData.append("field", field);
  formData.append("image", imageFile);
  formData.append("context", JSON.stringify(context));

  const response = await api.post("/api/ai/generate-item/", formData);
  return response.data;
};
