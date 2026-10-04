import { useCallback, useEffect, useState } from "react";
import api from "../../../Services/Api";

const useBanners = ({ refreshMs = 60000 } = {}) => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchBanners = useCallback(async (signal) => {
    try {
      setError(null);
      const response = await api.get("/api/banners-list/", { signal });
      const data = response.data;
      setBanners(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      if (err.name !== "CanceledError" && err.code !== "ERR_CANCELED") {
        setError(err);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchBanners(controller.signal);

    const interval = refreshMs > 0 ? window.setInterval(() => {
      fetchBanners();
    }, refreshMs) : null;

    return () => {
      controller.abort();
      if (interval) window.clearInterval(interval);
    };
  }, [fetchBanners, refreshMs]);

  return { banners, loading, error, refreshBanners: () => fetchBanners() };
};

export default useBanners;
