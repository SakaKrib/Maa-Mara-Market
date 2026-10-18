import { useState, useEffect } from "react";
import api from "../../../Services/Api";

const useBrands = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const fetchBrands = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get("/api/brands/", { signal: controller.signal });
        if (!controller.signal.aborted) {
          const data = response.data;
          setBrands(Array.isArray(data) ? data : (data?.results || []));
        }
      } catch (requestError) {
        if (requestError?.code !== "ERR_CANCELED") {
          setError(requestError);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchBrands();
    return () => controller.abort();
  }, []);

  return { brands, loading, error };
};

export default useBrands;
