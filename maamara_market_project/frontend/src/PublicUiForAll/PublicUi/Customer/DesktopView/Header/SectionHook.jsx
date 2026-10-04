import api from "../../../../../Services/Api";
import { useState, useEffect } from "react";

export function useCategories() {
  const [data, setData] = useState({ sections: [], brands: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true; // to avoid setting state if unmounted

    async function fetchData() {
      try {
        // `api` is assumed to be an axios instance, so no .json() needed
        const response = await api.get("/api/hierarchy/");

        if (isMounted) {
          setData(response.data);
          setLoading(false);
        }
      } catch (err) {
        if (isMounted) {
          setError(err.message || "Failed to fetch");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isMounted = false;
    };
  }, []);

  return { data, loading, error };
}
