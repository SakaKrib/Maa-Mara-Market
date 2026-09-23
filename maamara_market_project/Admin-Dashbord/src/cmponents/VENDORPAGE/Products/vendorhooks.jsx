import { useEffect, useState } from "react";
import api from "../../../../src/Services/Api"; // custom axios instance
import { baseUrl } from "../../Constant/Constant";

export function useVendor() {
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get(`${baseUrl}/api/vendor/profile/`, { withCredentials: true })
      .then(res => {
        // Normalize the authenticated vendor profile so the item form always
        // receives product_type as a direct, canonical value.
        const rawVendor = res?.data?.vendor ?? res?.data?.data ?? res?.data;
        const normalizedVendor =
          rawVendor && typeof rawVendor === "object"
            ? {
                ...rawVendor,
                product_type: String(
                  rawVendor.product_type ??
                    rawVendor.productType ??
                    rawVendor.vendor_data?.product_type ??
                    rawVendor.vendor_data?.productType ??
                    ""
                ).trim().toLowerCase(),
              }
            : rawVendor;

        setVendor(normalizedVendor);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError(err);
        setLoading(false);
      });
  }, []);

  return { vendor, loading, error };
}
