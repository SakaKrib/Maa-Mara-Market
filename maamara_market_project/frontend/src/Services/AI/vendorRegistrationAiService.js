import api from "../Api";

export const generateVendorRegistrationAI = async ({
  field,
  companyName = "",
  workshopLocation = "",
  productDescription = "",
  productType = "",
  websiteUrl = "",
  image = null,
}) => {
  const formData = new FormData();

  formData.append("field", field);
  formData.append(
    "context",
    JSON.stringify({
      company_name: companyName,
      workshop_location: workshopLocation,
      product_description: productDescription,
      product_type: productType,
      website_url: websiteUrl,
    })
  );

  if (image instanceof File) {
    formData.append("image", image);
  }

  const response = await api.post(
    "/api/ai/vendor-registration/",
    formData
  );

  return response.data;
};
