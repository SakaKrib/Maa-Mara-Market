import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useLocation, useNavigate } from "react-router-dom";
import api from "../../../../../Services/Api";

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
        <option key={key} value={value}>
          {value}
        </option>
      );
    });

  return (
    <div className="mt-12 flex flex-col md:flex-row md:justify-between gap-6 flex-wrap">

      {/* LEFT FILTERS */}
      <div className="flex flex-wrap gap-4 md:gap-6">

        {/* SECTION */}
        <select name="section" value={filters.section} onChange={handleChange} disabled={loading}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">
          <option value="">Section</option>
          {renderOptions(filterOptions.sections)}
        </select>

        {/* DEPARTMENT */}
        <select name="department" value={filters.department} onChange={handleChange} disabled={loading}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">
          <option value="">Department</option>
          {renderOptions(filterOptions.departments)}
        </select>

        {/* CATEGORY */}
        <select name="category" value={filters.category} onChange={handleChange} disabled={loading}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">
          <option value="">Category</option>
          {renderOptions(filterOptions.categories)}
        </select>

        {/* SIZE */}
        <select name="size" value={filters.size} onChange={handleChange} disabled={loading}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">
          <option value="">Size</option>
          {renderOptions(filterOptions.sizes)}
        </select>

        {/* COLOR */}
        <select name="color" value={filters.color} onChange={handleChange} disabled={loading}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">
          <option value="">Color</option>
          {renderOptions(filterOptions.colors)}
        </select>

        {/* MIN PRICE */}
        <input type="number" name="minPrice" value={filters.minPrice} onChange={handleChange}
          placeholder="Min Price"
          className="text-sm rounded-2xl pl-3 py-2 w-28 ring-1 ring-gray-300 bg-white"
        />

        {/* MAX PRICE */}
        <input type="number" name="maxPrice" value={filters.maxPrice} onChange={handleChange}
          placeholder="Max Price"
          className="text-sm rounded-2xl pl-3 py-2 w-28 ring-1 ring-gray-300 bg-white"
        />
      </div>

      {/* SORT */}
      <div className="flex items-center">
        <select name="sort" value={filters.sort} onChange={handleChange}
          className="py-2 px-3 rounded-2xl text-sm bg-gray-100 ring-1 ring-gray-300">

          <option value="">Sort By</option>
          <option value="low-high">Price: Low to High</option>
          <option value="high-low">Price: High to Low</option>
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

    </div>
  );
};

export default Filter;