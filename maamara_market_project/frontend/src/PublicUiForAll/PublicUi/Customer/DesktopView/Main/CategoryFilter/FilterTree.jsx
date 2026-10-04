import React from "react";

const truncateWords = (text, maxLength = 15) =>
  text && text.length > maxLength ? `${text.slice(0, maxLength)}...` : (text || "");

const FilterTree = ({ filters, selectedFilters, toggleFilter }) => (
  <div className="space-y-5">
    {filters.sections?.length > 0 && (
      <div>
        <h4 className="font-semibold text-lg mb-3">Sections</h4>
        <ul className="space-y-2">
          {filters.sections.map((section) => (
            <li key={section.id}>
              <label className="flex gap-2">
                <input type="checkbox" checked={selectedFilters.sections.includes(section.id)} onChange={() => toggleFilter("sections", section.id)} />
                {truncateWords(section.name)} ({section.count})
              </label>
              {section.departments?.length > 0 && (
                <ul className="ml-4 space-y-2 mt-2">
                  {section.departments.map((department) => (
                    <li key={department.id}>
                      <label className="flex gap-2">
                        <input type="checkbox" checked={selectedFilters.departments.includes(department.id)} onChange={() => toggleFilter("departments", department.id)} />
                        {truncateWords(department.name, 18)} ({department.count})
                      </label>
                      {department.categories?.length > 0 && (
                        <ul className="ml-4 space-y-2 mt-2">
                          {department.categories.map((category) => (
                            <li key={category.id}>
                              <label className="flex gap-2">
                                <input type="checkbox" checked={selectedFilters.categories.includes(category.id)} onChange={() => toggleFilter("categories", category.id)} />
                                {truncateWords(category.name)} ({category.count})
                              </label>
                              {category.subcategories?.length > 0 && (
                                <ul className="ml-4 space-y-2 mt-2">
                                  {category.subcategories.map((sub) => (
                                    <li key={sub.id}>
                                      <label className="flex gap-2">
                                        <input type="checkbox" checked={selectedFilters.subcategories.includes(sub.id)} onChange={() => toggleFilter("subcategories", sub.id)} />
                                        {truncateWords(sub.name)} ({sub.count})
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
      </div>
    )}
    {filters.brands?.length > 0 && (
      <div>
        <h4 className="font-semibold mb-2">Brands</h4>
        {filters.brands.map((brand) => (
          <label key={brand.id} className="flex items-center gap-2">
            <input type="checkbox" checked={selectedFilters.brands.includes(brand.id)} onChange={() => toggleFilter("brands", brand.id)} />
            <span>{truncateWords(brand.name)} ({brand.count})</span>
          </label>
        ))}
      </div>
    )}
    {filters.colors?.length > 0 && (
      <div>
        <h4 className="font-semibold mb-2">Colors</h4>
        <div className="flex flex-wrap gap-2">
          {filters.colors.map((color) => (
            <label key={color} className="flex items-center gap-1">
              <input type="radio" name="category-color" checked={selectedFilters.color === color} onChange={() => toggleFilter("color", color)} />
              {color}
            </label>
          ))}
        </div>
      </div>
    )}
    <div>
      <h4 className="font-semibold">Price</h4>
      <input type="range" min={filters.priceRange?.min || 0} max={filters.priceRange?.max || 150000} value={selectedFilters.priceRange[1]} onChange={(e) => toggleFilter("priceRange", [0, parseInt(e.target.value, 10)])} className="w-full" />
      <div className="text-sm">KES {selectedFilters.priceRange[0]} - KES {selectedFilters.priceRange[1]}</div>
    </div>
  </div>
);

export default FilterTree;
