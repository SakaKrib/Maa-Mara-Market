import React, { useEffect, useState } from "react";
import api from "../../../../../Services/Api"; // axios wrapper with baseUrl
import { baseUrl } from "../../../../../cmponents/Constant/Constant";
import AddToCartButton from "./CartActionButtons/AddToCartBtn";
import { Link } from "react-router-dom";



const SingleCategory = () => {
  const [filters, setFilters] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    sections: [],
    departments: [],
    categories: [],
    subcategories: [],
    brands: [],
    color: "",
    priceRange: [0, 150000],
    sortBy: "Default",
    perPage: 10,
  });

  const [products, setProducts] = useState([]);
  const [loadingFilters, setLoadingFilters] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(true);


  // Helper to truncate text
  const truncateWords = (text, maxLength = 15) => {
    if (!text) return "";
    return text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
  };
  

  

  // ✅ Fetch filters on mount
  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const res = await api.get(`${baseUrl}/filters/`);
        setFilters(res.data || {});
        console.log("Fetched filters:", res.data);
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoadingFilters(false);
      }
    };
    fetchFilters();
  }, []);

  // ✅ Fetch products when filters change
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const res = await api.get(`${baseUrl}/filter-products`, {
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
        });
        setProducts(res.data.results || res.data || []);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoadingProducts(false);
      }
    };
    fetchProducts();
  }, [selectedFilters]);

  if (loadingFilters) return <p>Loading filters...</p>;
  if (!filters) return <p>No filters available</p>;

  return (
    <div className="single-category">
      <div className="container">
        <div className="wrapper flex gap-4">
          {/* Sidebar Filters */}
          <aside className="w-1/4 p-4 border-r space-y-6 bg-gray-100 " >
            <h3 className="font-bold mb-2 border-b b-black mb-2">Filters</h3>

            <div className="" style={{maxHeight:'70vh', overflowY:'auto'}}>
            {/* ✅ Sections → Departments → Categories → Subcategories */}
            {filters.sections?.length > 0 && (
              <>
                <h4 className="font-semibold text-lg mb-5">Sections</h4>
                <ul className="space-y-2">
                  {filters.sections.map((sec) => (
                    <li key={sec.id}>
                      <label className="flex gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFilters.sections.includes(sec.id)}
                          onChange={() =>
                            setSelectedFilters((prev) => ({
                              ...prev,
                              sections: prev.sections.includes(sec.id)
                                ? prev.sections.filter((s) => s !== sec.id)
                                : [...prev.sections, sec.id],
                            }))
                          }
                        />
                        {truncateWords(sec.name)} ({sec.count})
                      </label>

                      {/* Departments inside Section */}
                      {sec.departments?.length > 0 && (
                        <ul className="ml-4">
                          {sec.departments.map((dep) => (
                            <li key={dep.id}>
                              <label className="flex gap-2">
                                <input
                                  type="checkbox"
                                  checked={selectedFilters.departments.includes(dep.id)}
                                  onChange={() =>
                                    setSelectedFilters((prev) => ({
                                      ...prev,
                                      departments: prev.departments.includes(dep.id)
                                        ? prev.departments.filter((d) => d !== dep.id)
                                        : [...prev.departments, dep.id],
                                    }))
                                  }
                                />
                                {truncateWords(dep.name, 3)} ({dep.count})
                              </label>

                              {/* Categories inside Department */}
                              {dep.categories?.length > 0 && (
                                <ul className="ml-4">
                                  {dep.categories.map((cat) => (
                                    <li key={cat.id}>
                                      <label className="flex gap-2">
                                        <input
                                          type="checkbox"
                                          checked={selectedFilters.categories.includes(cat.id)}
                                          onChange={() =>
                                            setSelectedFilters((prev) => ({
                                              ...prev,
                                              categories: prev.categories.includes(cat.id)
                                                ? prev.categories.filter((c) => c !== cat.id)
                                                : [...prev.categories, cat.id],
                                            }))
                                          }
                                        />
                                        {truncateWords(cat.name)}  ({cat.count})
                                      </label>

                                      {/* Subcategories inside Category */}
                                      {cat.subcategories?.length > 0 && (
                                        <ul className="ml-4">
                                          {cat.subcategories.map((sub) => (
                                            <li key={sub.id}>
                                              <label className="flex gap-2">
                                                <input
                                                  type="checkbox"
                                                  checked={selectedFilters.subcategories.includes(sub.id)}
                                                  onChange={() =>
                                                    setSelectedFilters((prev) => ({
                                                      ...prev,
                                                      subcategories: prev.subcategories.includes(sub.id)
                                                        ? prev.subcategories.filter((s) => s !== sub.id)
                                                        : [...prev.subcategories, sub.id],
                                                    }))
                                                  }
                                                />
                                                {truncateWords(sub.name) }({sub.count})
                                              </label>
                                            </li>
                                          ))}
                                        </ul>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
            </div>

            {/* ✅ Brands */}
            {filters.brands?.length > 0 && (
              <>
                <h4 className="font-semibold">Brands</h4>
                <ul>
                  {filters.brands.map((brand) => (
                    <li key={brand.id}>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={selectedFilters.brands.includes(brand.id)}
                          onChange={() =>
                            setSelectedFilters((prev) => ({
                              ...prev,
                              brands: prev.brands.includes(brand.id)
                                ? prev.brands.filter((b) => b !== brand.id)
                                : [...prev.brands, brand.id],
                            }))
                          }
                        />
                        <span>{truncateWords( brand.name)} ({brand.count})</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}



            {/* ✅ Colors */}
            {filters.colors?.length > 0 && (
              <>
                <h4 className="font-semibold">Colors</h4>
                <ul className="flex flex-wrap gap-2">
                  {filters.colors.map((color) => (
                    <li key={color}>
                      <label className="flex items-center space-x-1">
                        <input
                          type="radio"
                          name="color"
                          checked={selectedFilters.color === color}
                          onChange={() =>
                            setSelectedFilters((prev) => ({
                              ...prev,
                              color,
                            }))
                          }
                        />
                        <span>{color}</span>
                      </label>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {/* ✅ Price */}
            <div>
              <h4 className="font-semibold">Price</h4>
              <input
                type="range"
                min={filters.priceRange?.min || 0}
                max={filters.priceRange?.max || 150000}
                value={selectedFilters.priceRange[1]}
                onChange={(e) =>
                  setSelectedFilters((prev) => ({
                    ...prev,
                    priceRange: [0, parseInt(e.target.value)],
                  }))
                }
              />
              <div>
                <span>KES {selectedFilters.priceRange[0]}</span> -{" "}
                <span>KES {selectedFilters.priceRange[1]}</span>
              </div>
            </div>
          </aside>

          {/* Main Section */}
          <main className="w-3/4 p-4">
            {/* Topbar */}
            <div className="flex justify-between mb-4">
              <div>
                Sort by:{" "}
                <select
                  value={selectedFilters.sortBy}
                  onChange={(e) =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      sortBy: e.target.value,
                    }))
                  }
                  className="ring-1 p-2 rounded-md"
                >
                  {["Default", "Product Name", "Price", "Brand"].map((sort) => (
                    <option key={sort}>{sort}</option>
                  ))}
                </select>
              </div>
              <div>
                Show:{" "}
                <select
                  value={selectedFilters.perPage}
                  onChange={(e) =>
                    setSelectedFilters((prev) => ({
                      ...prev,
                      perPage: parseInt(e.target.value),
                    }))
                  }
                  className="ring-1 p-2 rounded-md"
                >
                  {[10, 20, 30, 40].map((num) => (
                    <option key={num} value={num}>
                      {num}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* ✅ Products */}
{/* ✅ Products */}

    <div className="flex flex-wrap -mx-2 scroll" style={{maxHeight:'95vh', overflowY:'auto'}}>
    {loadingProducts ? (
      <p>Loading products...</p>
    ) : products.length > 0 ? (
      products.map((item) => (
        <div
          key={item.id}
          className="w-1/2 sm:w-1/3 lg:w-1/4 px-2 mb-4"
        >
          <div className="bg-white shadow-md rounded-lg overflow-hidden relative">
            <Link to={`/item/${item.id}`}>
              <div className="relative w-full h-48">
                <img
                  src={
                    item.image
                      ? item.image.startsWith("http")
                        ? item.image
                        : `${baseUrl}${item.image}`
                      : "/placeholder.png"
                  }
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {item.discount > 0 && (
                  <div className="absolute bottom-2 left-2 bg-red-600 text-white text-xs font-semibold px-2 py-1 rounded-full">
                    {item.discount}% OFF
                  </div>
                )}
              </div>
            </Link>
  
            <div className="p-4">
              <Link to={`/item/${item.id}`}>
                <h3 className="text-base font-semibold text-gray-800 mb-1">
                  {item.name}
                </h3>
              </Link>
              <p className="text-sm text-gray-500 mb-2">
                ({item.rating || 0} reviews)
              </p>
  
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg font-bold text-red-600">
                  KES {parseFloat(item.final_price).toLocaleString()}
                </span>
                {item.discount > 0 && (
                  <span className="line-through text-gray-400 text-sm">
                    KES{" "}
                    {(
                      item.final_price /
                      (1 - item.discount / 100)
                    )
                      .toFixed(0)
                      .toLocaleString()}
                  </span>
                )}
              </div>
  
              <div className="flex justify-between items-center text-sm text-gray-500 mb-3">
                <p>{item.sold || 0} sold</p>
                <p>{item.in_stock || 0} in stock</p>
              </div>
  
              <div>
                <AddToCartButton itemId={item.id} />
              </div>
            </div>
          </div>
        </div>
      ))
    ) : (
      <p>No products found for selected filters.</p>
    )}
  </div>
  


          </main>
        </div>
      </div>
    </div>
  );
};

export default SingleCategory;
