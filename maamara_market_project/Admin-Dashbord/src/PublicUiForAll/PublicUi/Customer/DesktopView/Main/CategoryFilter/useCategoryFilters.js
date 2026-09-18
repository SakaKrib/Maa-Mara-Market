import { useCallback, useEffect, useState } from "react";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

const useCategoryFilters = () => {
  const [filters, setFilters] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    sections: [], departments: [], categories: [], subcategories: [],
    brands: [], color: "", priceRange: [0, 150000], sortBy: "Default", perPage: 10,
  });
  const [products, setProducts] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);

  useEffect(() => {
    let active = true;
    api.get(`${baseUrl}/filters/`).then((res) => {
      if (active) setFilters(res.data || {});
    }).catch(() => {
      if (active) setFilters({});
    }).finally(() => {
      if (active) setLoadingFilters(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    setLoadingProducts(true);
    api.get(`${baseUrl}/filter-products`, {
      params: {
        sections: selectedFilters.sections.join(","),
        departments: selectedFilters.departments.join(","),
        categories: selectedFilters.categories.join(","),
        subcategories: selectedFilters.subcategories.join(","),
        brands: selectedFilters.brands.join(","),
        color: selectedFilters.color,
        min_price: selectedFilters.priceRange[0],
        max_price: selectedFilters.priceRange[1],
        sortBy: selectedFilters.sortBy,
        perPage: selectedFilters.perPage,
      },
    }).then((res) => {
      if (active) setProducts(res.data.results || res.data || []);
    }).catch(() => {
      if (active) setProducts([]);
    }).finally(() => {
      if (active) setLoadingProducts(false);
    });
    return () => { active = false; };
  }, [selectedFilters]);

  const toggleFilter = useCallback((group, id) => {
    setSelectedFilters((prev) => ({
      ...prev,
      [group]: prev[group].includes(id)
        ? prev[group].filter((value) => value !== id)
        : [...prev[group], id],
    }));
  }, []);

  return { filters, selectedFilters, setSelectedFilters, products, loadingFilters, loadingProducts, toggleFilter };
};

export default useCategoryFilters;
