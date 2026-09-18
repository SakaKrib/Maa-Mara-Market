import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";
import { IonIcon } from "@ionic/react";
import { filterOutline, closeOutline } from "ionicons/icons";

const Filter = ({ onFilterChange }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  /* ================= OPTIONS ================= */
  const [filterOptions, setFilterOptions] = useState({
    sections: [],
    departments: [],
    categories: [],
    sizes: [],
    colors: [],
    brands: [],
  });

  /* ================= FILTER STATE ================= */
  const [filters, setFilters] = useState({
    section: "",
    department: "",
    category: "",
    size: "",
    color: "",
    minPrice: "",
    maxPrice: "",
    sort: "",
  });

  const [loading, setLoading] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ================= FETCH OPTIONS ================= */
  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);

        const res = await api.get("/api/filter-options/");
        const data = res.data;

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

  /* ================= INIT FROM URL ================= */
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

  /* ================= UPDATE URL ================= */
  const updateURL = useCallback(
    (updated) => {
      const params = new URLSearchParams(location.search);

      Object.entries(updated).forEach(([key, value]) => {
        if (value) params.set(key, value);
        else params.delete(key);
      });

      navigate({ search: params.toString() }, { replace: true });
    },
    [location.search, navigate]
  );

  /* ================= HANDLE CHANGE ================= */
  const handleChange = (e) => {
    const { name, value } = e.target;

    const updated = { ...filters, [name]: value };

    setFilters(updated);
    updateURL(updated);
  };

  /* ================= SEND TO PARENT ================= */
  useEffect(() => {
    const cleaned = Object.fromEntries(
      Object.entries(filters).filter(([_, v]) => v)
    );

    onFilterChange(cleaned);
  }, [filters, onFilterChange]);

  /* ================= SAFE RENDER HELPERS ================= */
  const renderOptions = (list) =>
    list.map((item) => {
      // supports both: "string" OR {id, name}
      const value = typeof item === "object" ? item.name : item;
      const key = typeof item === "object" ? item.id : item;

      return (
    <div className="marketplace-filter">
      <button type="button" className="mobile-filter-trigger" onClick={() => setMobileOpen(true)}>
        <IonIcon icon={filterOutline} /> <span>Filters</span>
      </button>

      <div className={`marketplace-filter__panel ${mobileOpen ? "is-open" : ""}`}>
        <div className="marketplace-filter__mobile-head">
          <strong>Filter products</strong>
          <button type="button" aria-label="Close filters" onClick={() => setMobileOpen(false)}><IonIcon icon={closeOutline} /></button>
        </div>
        <div className="marketplace-filter__fields">
          <select name="section" value={filters.section} onChange={handleChange} disabled={loading}><option value="">Section</option>{renderOptions(filterOptions.sections)}</select>
          <select name="department" value={filters.department} onChange={handleChange} disabled={loading}><option value="">Department</option>{renderOptions(filterOptions.departments)}</select>
          <select name="category" value={filters.category} onChange={handleChange} disabled={loading}><option value="">Category</option>{renderOptions(filterOptions.categories)}</select>
          <select name="size" value={filters.size} onChange={handleChange} disabled={loading}><option value="">Size</option>{renderOptions(filterOptions.sizes)}</select>
          <select name="color" value={filters.color} onChange={handleChange} disabled={loading}><option value="">Color</option>{renderOptions(filterOptions.colors)}</select>
          <input type="number" name="minPrice" value={filters.minPrice} onChange={handleChange} placeholder="Min price" />
          <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleChange} placeholder="Max price" />
          <select name="sort" value={filters.sort} onChange={handleChange}><option value="">Sort by</option><option value="low-high">Price: Low to High</option><option value="high-low">Price: High to Low</option><option value="newest">Newest First</option><option value="oldest">Oldest First</option></select>
        </div>
        <button type="button" className="primary-button marketplace-filter__apply" onClick={() => setMobileOpen(false)}>Apply filters</button>
      </div>
    </div>
  );;