import api from "../Api";

export const generateBlogWithAI = async ({ title, item, image, video }) => {
  const formData = new FormData();
  formData.append("title", title);
  if (item) formData.append("item", item);
  if (image instanceof File) formData.append("image", image);
  if (video instanceof File) formData.append("video", video);

  const response = await api.post("/api/ai/generate-blog/", formData, {
    withCredentials: true,
    timeout: 120000,
  });
  return response.data;
};
