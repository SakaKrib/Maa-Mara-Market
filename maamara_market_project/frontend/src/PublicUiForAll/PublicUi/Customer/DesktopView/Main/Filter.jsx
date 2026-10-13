import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";
import { IonIcon } from "@ionic/react";
import { filterOutline, closeOutline } from "ionicons/icons";
import NativeAwareSelect from "../../../../../components/NativeAwareSelect";

const Filter = ({ onFilterChange }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [filterOptions, setFilterOptions] = useState({ sections: [], departments: [], categories: [], sizes: [], colors: [], brands: [] });
  const [filters, setFilters] = useState({ section: "", department: "", category: "", size: "", color: "", minPrice: "", maxPrice: "", sort: "" });
  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        const res = await api.get("/api/filter-options/");
        const data = res.data || {};
        setFilterOptions({
          sections: data.sections || [],
          departments: data.departments || [],
          categories: data.categories || [],
          sizes: data.sizes || [],
          colors: data.colors || [],
          brands: data.brands || [],
        });
      } catch (err) {
        console.error("Filter options error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOptions();
  }, []);

  useEffect(() => {
    setFilters({
      section: searchParams.get("section") || "",
      department: searchParams.get("department") || "",
      category: searchParams.get("category") || "",
      size: searchParams.get("size") || "",
      color: searchParams.get("color") || "",
      minPrice: searchParams.get("minPrice") || "",
      maxPrice: searchParams.get("maxPrice") || "",
      sort: searchParams.get("sort") || "",
    });
  }, [searchParams]);

  const updateURL = useCallback((updated) => {
    const params = new URLSearchParams(location.search);
    Object.entries(updated).forEach(([key, value]) => value ? params.set(key, value) : params.delete(key));
    navigate({ search: params.toString() }, { replace: true });
  }, [location.search, navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const updated = { ...filters, [name]: value };
    setFilters(updated);
    updateURL(updated);
  };

  useEffect(() => {
    const cleaned = Object.fromEntries(Object.entries(filters).filter(([, value]) => value));
    onFilterChange?.(cleaned);
  }, [filters, onFilterChange]);

  const renderOptions = (list) => list.map((item) => {
    const value = typeof item === "object" ? item.name : item;
    return { value: String(value ?? ""), label: String(value ?? "") };
  });

  return (
    <div className="marketplace-filter">
      <button type="button" className="mobile-filter-trigger" onClick={() => setMobileOpen(true)}>
        <IonIcon icon={filterOutline} /> <span>Filters</span>
      </button>

      <div className={`marketplace-filter__panel ${mobileOpen ? "is-open" : ""}`}>
        <div className="marketplace-filter__mobile-head">
          <strong>Filter products</strong>
          <button type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)}>
            <IonIcon icon={closeOutline} />
          </button>
        </div>

        <div className="marketplace-filter__fields">
          <NativeAwareSelect name="section" aria-label="Section" value={filters.section} onChange={handleChange} disabled={loading} className="marketplace-filter__select" options={[{ value: "", label: "Section" }, ...renderOptions(filterOptions.sections)]} />
          <NativeAwareSelect name="department" aria-label="Department" value={filters.department} onChange={handleChange} disabled={loading} className="marketplace-filter__select" options={[{ value: "", label: "Department" }, ...renderOptions(filterOptions.departments)]} />
          <NativeAwareSelect name="category" aria-label="Category" value={filters.category} onChange={handleChange} disabled={loading} className="marketplace-filter__select" options={[{ value: "", label: "Category" }, ...renderOptions(filterOptions.categories)]} />
          <NativeAwareSelect name="size" aria-label="Size" value={filters.size} onChange={handleChange} disabled={loading} className="marketplace-filter__select" options={[{ value: "", label: "Size" }, ...renderOptions(filterOptions.sizes)]} />
          <NativeAwareSelect name="color" aria-label="Color" value={filters.color} onChange={handleChange} disabled={loading} className="marketplace-filter__select" options={[{ value: "", label: "Color" }, ...renderOptions(filterOptions.colors)]} />
          <input type="number" name="minPrice" value={filters.minPrice} onChange={handleChange} placeholder="Min price" />
          <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleChange} placeholder="Max price" />
          <NativeAwareSelect name="sort" aria-label="Sort by" value={filters.sort} onChange={handleChange} className="marketplace-filter__select" options={[{ value: "", label: "Sort by" }, { value: "low-high", label: "Price: Low to High" }, { value: "high-low", label: "Price: High to Low" }, { value: "newest", label: "Newest First" }, { value: "oldest", label: "Oldest First" }]} />
        </div>

        <button type="button" className="primary-button marketplace-filter__apply" onClick={() => setMobileOpen(false)}>Apply filters</button>
      </div>
    </div>
  );
};

export default Filter;
