import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../../../../../../Services/Api";
const endpoint = (path) => path;

const buildProductsUrl = (selectedFilters, page = 1) => {
  const params = new URLSearchParams();
  const addList = (key, values) => {
    if (values?.length) params.set(key, values.join(","));
  };

  addList("sections", selectedFilters.sections);
  addList("departments", selectedFilters.departments);
  addList("categories", selectedFilters.categories);
  addList("subcategories", selectedFilters.subcategories);
  addList("brands", selectedFilters.brands);
  if (selectedFilters.attribute) params.set("attribute", selectedFilters.attribute);
  if (selectedFilters.color) params.set("color", selectedFilters.color);
  if (selectedFilters.priceRange?.[0] != null) params.set("min_price", selectedFilters.priceRange[0]);
  if (selectedFilters.priceRange?.[1] != null) params.set("max_price", selectedFilters.priceRange[1]);
  if (selectedFilters.sortBy) params.set("sortBy", selectedFilters.sortBy);
  params.set("perPage", String(selectedFilters.perPage));
  if (page > 1) params.set("page", String(page));

  return `${endpoint("/filter-products/")}${params.toString() ? `?${params.toString()}` : ""}`;
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
    attribute: "",
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
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
          const requestUrl = api.getUri({ url: endpoint("/filters/") });
          const diagnostic = {
            url: requestUrl,
            status: requestError?.response?.status ?? null,
            response: requestError?.response?.data ?? null,
            code: requestError?.code ?? null,
            message: requestError?.message ?? "Unknown request error",
          };
          console.error(
            `[CategoryFilters] Failed to load filter options: ${JSON.stringify(diagnostic)}`
          );

          setFilters({});
          setError(
            requestError?.response?.status
              ? `Unable to load product filters (HTTP ${requestError.response.status}).`
              : "Unable to load product filters. Check your connection and try again."
          );
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
      setTotalCount(Number.isFinite(Number(data.count)) ? Number(data.count) : (Array.isArray(data) ? data.length : null));
      const requestedPage = Number(new URL(typeof url === "string" ? url : api.getUri({ url }), window.location.origin).searchParams.get("page") || 1);
      setCurrentPage(Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1);
    } catch (requestError) {
      if (requestError?.code === "ERR_CANCELED") return;
      const diagnostic = {
        url: typeof url === "string" ? url : api.getUri({ url }),
        status: requestError?.response?.status ?? null,
        response: requestError?.response?.data ?? null,
        code: requestError?.code ?? null,
        message: requestError?.message ?? "Unknown request error",
      };
      console.error(
        `[CategoryFilters] Failed to load filtered products: ${JSON.stringify(diagnostic)}`
      );
      setProducts([]);
      setNextUrl(null);
      setPrevUrl(null);
      setError(
        requestError?.response?.status
          ? `Unable to load filtered products (HTTP ${requestError.response.status}).`
          : "Unable to load filtered products. Check your connection and try again."
      );
    } finally {
      if (!signal?.aborted) setLoadingProducts(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(buildProductsUrl(selectedFilters), controller.signal);
    return () => controller.abort();
  }, [selectedFilters, fetchProducts]);

  const goToPage = useCallback((page) => {
    if (!Number.isInteger(page) || page < 1) return;
    fetchProducts(buildProductsUrl(selectedFilters, page));
  }, [fetchProducts, selectedFilters]);

  const toggleFilter = useCallback((group, value) => {
    setSelectedFilters((prev) => {
      if (group === "color" || group === "attribute" || group === "priceRange") {
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
      attribute: "",
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
    currentPage,
    totalCount,
    goToPage,
    loadingFilters,
    loadingProducts,
    error,
    fetchProducts,
    resetFilters,
    toggleFilter,
  };
};

export default useCategoryFilters;
