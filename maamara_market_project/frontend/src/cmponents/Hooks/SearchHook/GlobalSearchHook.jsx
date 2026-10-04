import { useState, useCallback, useRef } from "react";
import api from "../../../Services/Api";

export default function useDynamicSearch({
  url = "/api/search-all/",
  resultKey = "results",
  transform = null,
} = {}) {
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false); // 🔥 IMPORTANT

  const requestId = useRef(0);

  const clear = useCallback(() => {
    setData({});
    setQuery("");
    setOpen(false);
  }, []);

  const search = useCallback(
    async (q, extraParams = {}) => {
      const trimmed = q?.trim();

      if (!trimmed) {
        clear();
        return;
      }

      const currentRequest = ++requestId.current;

      setLoading(true);
      setQuery(trimmed);
      setOpen(true);

      try {
        const res = await api.get(url, {
          params: {
            q: trimmed,
            ...extraParams,
          },
          withCredentials: true,
        });

        // ignore old responses
        if (currentRequest !== requestId.current) return;

        let result = res.data?.[resultKey] || {};

        if (transform) {
          result = transform(result);
        }

        setData(result);
      } catch (err) {
        console.error("Search error:", err);
        setData({});
      } finally {
        if (currentRequest === requestId.current) {
          setLoading(false);
        }
      }
    },
    [url, resultKey, transform, clear]
  );

  return {
    search,
    data,
    loading,
    query,
    open,
    setOpen,
    clear,
  };
}