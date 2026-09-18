import { useEffect, useState } from "react";
import api from "../../../Services/Api";

const useBanners = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  console.log(banners)

  useEffect(() => {
    const fetchBanners = async () => {
      try {
        const response = await api.get("/api/banners-list/");
        setBanners(response.data.results || []);  // 👈 use results array
      } catch (err) {
        setError(err);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();
  }, []);

  return { banners, loading, error };
};

export default useBanners;
