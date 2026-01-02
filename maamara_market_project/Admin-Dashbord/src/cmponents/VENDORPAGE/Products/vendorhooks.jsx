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
        setVendor(res.data);
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
