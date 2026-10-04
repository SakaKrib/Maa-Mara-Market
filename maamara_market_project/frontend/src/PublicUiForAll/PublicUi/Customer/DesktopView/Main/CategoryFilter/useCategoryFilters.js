import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "@/Services/Api";
import { baseUrl } from "@/cmponents/Constant/Constant";

const endpoint = (path) => {
  const prefix = baseUrl || "";
  return `${prefix.replace(/\/$/, "")}${path}`;
};

const useCategoryFilters = () => {
  const [searchParams] = useSearchParams();
  const categoryFromUrl = Number(searchParams.get("category"));
  const initialCategories = Number.isFinite(categoryFromUrl) && categoryFromUrl > 0 ? [categoryFromUrl] : [];

  const [filters, setFilters] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    sections: [],
    departments: [],
    categories: initialCategories,
    subcategories: [],
    brands: [],
    color: "",
    priceRange: [0, 150000],
    sortBy: "Default",
    perPage: 10,
  });
  useEffect(() => {
    setSelectedFilters((prev) => {
      const nextCategories = Number.isFinite(categoryFromUrl) && categoryFromUrl > 0 ? [categoryFromUrl] : [];
      const same =
        prev.categories.length === nextCategories.length &&
        prev.categories.every((value, index) => value === nextCategories[index]);
      return same ? prev : { ...prev, categories: nextCategories };
    });
  }, [categoryFromUrl]);

  const [products, setProducts] = useState([]);
  const [nextUrl, setNextUrl] = useState(null);
  const [prevUrl, setPrevUrl] = useState(null);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    api.get(endpoint("/filters/"), { signal: controller.signal })
      .then((res) => {
        const data = res.data || {};
        setFilters(data);

        const min = Number(data.priceRange?.min ?? 0);
        const max = Number(data.priceRange?.max ?? 150000);
        setSelectedFilters((prev) => {
          const currentMax = Number(prev.priceRange?.[1] ?? 150000);
          const shouldUseApiRange = currentMax === 150000 || currentMax > max;
          return {
            ...prev,
            priceRange: [min, shouldUseApiRange ? max : currentMax],
          };
        });
      })
      .catch((requestError) => {
        if (requestError?.code !== "ERR_CANCELED") {
          setFilters({});
          setError("Unable to load product filters.");
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingFilters(false);
      });

    return () => controller.abort();
  }, []);

  const fetchProducts = useCallback(async (url, signal) => {
    setLoadingProducts(true);
    setError("");

    try {
      const res = await api.get(url, { signal });
      const data = res.data || {};
      setProducts(Array.isArray(data) ? data : data.results || []);
      setNextUrl(data.next || null);
      setPrevUrl(data.previous || null);
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED") return;
      setProducts([]);
      setNextUrl(null);
      setPrevUrl(null);
      setError("Unable to load products. Please try again.");
    } finally {
      if (!signal?.aborted) setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams();

    const addList = (key, values) => {
      if (values?.length) params.set(key, values.join(","));
    };

    addList("sections", selectedFilters.sections);
    addList("departments", selectedFilters.departments);
    addList("categories", selectedFilters.categories);
    addList("subcategories", selectedFilters.subcategories);
    addList("brands", selectedFilters.brands);

    if (selectedFilters.color) params.set("color", selectedFilters.color);
    if (selectedFilters.priceRange?.[0] != null) params.set("min_price", selectedFilters.priceRange[0]);
    if (selectedFilters.priceRange?.[1] != null) params.set("max_price", selectedFilters.priceRange[1]);
    if (selectedFilters.sortBy) params.set("sortBy", selectedFilters.sortBy);
    params.set("perPage", String(selectedFilters.perPage));

    fetchProducts(`${endpoint("/filter-products/")}${params.toString() ? `?${params.toString()}` : ""}`, controller.signal);
    return () => controller.abort();
  }, [selectedFilters, fetchProducts]);

  const toggleFilter = useCallback((group, value) => {
    setSelectedFilters((prev) => {
      if (group === "color" || group === "priceRange") {
        return { ...prev, [group]: value };
      }

      const values = Array.isArray(prev[group]) ? prev[group] : [];
      return {
        ...prev,
        [group]: values.includes(value)
          ? values.filter((id) => id !== value)
          : [...values, value],
      };
    });
  }, []);

  const resetFilters = useCallback(() => {
    const min = Number(filters?.priceRange?.min ?? 0);
    const max = Number(filters?.priceRange?.max ?? 150000);
    setSelectedFilters({
      sections: [],
      departments: [],
      categories: [],
      subcategories: [],
      brands: [],
      color: "",
      priceRange: [min, max],
      sortBy: "Default",
      perPage: 10,
    });
  }, [filters]);

  return {
    filters,
    selectedFilters,
    setSelectedFilters,
    products,
    nextUrl,
    prevUrl,
    loadingFilters,
    loadingProducts,
    error,
    fetchProducts,
    resetFilters,
    toggleFilter,
  };
};

export default useCategoryFilters;
