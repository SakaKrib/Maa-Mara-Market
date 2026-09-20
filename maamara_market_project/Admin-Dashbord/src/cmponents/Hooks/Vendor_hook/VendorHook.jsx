import { useEffect, useState } from "react";
import api from "../../../Services/Api";

const useVendors = () => {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // ✅ prevents state updates if component unmounts

    api
      .get("/api/vendors/", {
        headers: {
          "Content-Type": "application/json",
        },
        withCredentials: true,
      })
      .then((response) => {
        // ✅ works for both paginated & non-paginated APIs
        const vendorArray = response.data.results || response.data || [];

        const formattedData = vendorArray.map((vendor) => ({
          id: vendor.id,
          Vcode: vendor.vendor_code || "N/A",
          name: vendor.first_name || vendor.company_name || "N/A",
          email: vendor.email || "N/A",
          image: vendor.profile || vendor.profile_picture_url || "/default-avatar.png",
          company: vendor.company_name || "",
          regDate: vendor.date_created || "",
          phone: vendor.phone_number || "",
          workshop: vendor.workshop_location || "",
          items: vendor.items || [],
          access: "admin", // 🔧 placeholder, can make dynamic later
          country: vendor.country,
          city: vendor.city,
          address: vendor.address,
          username: vendor.username,
          last_name: vendor.surname_name,
          role: "vendor"
        }));

        if (isMounted) {
          setVendors(formattedData);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err);
          setLoading(false);
        }
      });

    return () => {
      isMounted = false; // cleanup
    };
  }, []);

  return { vendors, loading, error };
};

export default useVendors;
