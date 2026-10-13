import React from "react";

const truncateWords = (text, maxLength = 15) =>
  text && text.length > maxLength ? `${text.slice(0, maxLength)}...` : (text || "");

const FilterTree = ({ filters, selectedFilters, toggleFilter }) => (
  <div className="mm-filter-tree">
    {filters.sections?.length > 0 && (
      <section className="mm-filter-tree__group">
        <h4 className="mm-filter-tree__section-title">Sections</h4>
        <ul className="mm-filter-tree__options">
          {filters.sections.map((section) => (
            <li key={section.id}>
              <label className="mm-filter-tree__option">
                <input
                  className="mm-filter-tree__input"
                  type="checkbox"
                  checked={selectedFilters.sections.includes(section.id)}
                  onChange={() => toggleFilter("sections", section.id)}
                />
                <span className="mm-filter-tree__name">{truncateWords(section.name)}</span>
                <span className="mm-filter-tree__count">{section.count}</span>
              </label>
              {section.departments?.length > 0 && (
                <ul className="mm-filter-tree__nested-list">
                  {section.departments.map((department) => (
                    <li key={department.id}>
                      <label className="mm-filter-tree__option">
                        <input
                          className="mm-filter-tree__input"
                          type="checkbox"
                          checked={selectedFilters.departments.includes(department.id)}
                          onChange={() => toggleFilter("departments", department.id)}
                        />
                        <span className="mm-filter-tree__name">{truncateWords(department.name, 18)}</span>
                        <span className="mm-filter-tree__count">{department.count}</span>
                      </label>
                      {department.categories?.length > 0 && (
                        <ul className="mm-filter-tree__nested-list">
                          {department.categories.map((category) => (
                            <li key={category.id}>
                              <label className="mm-filter-tree__option">
                                <input
                                  className="mm-filter-tree__input"
                                  type="checkbox"
                                  checked={selectedFilters.categories.includes(category.id)}
                                  onChange={() => toggleFilter("categories", category.id)}
                                />
                                <span className="mm-filter-tree__name">{truncateWords(category.name)}</span>
                                <span className="mm-filter-tree__count">{category.count}</span>
                              </label>
                              {category.subcategories?.length > 0 && (
                                <ul className="mm-filter-tree__nested-list">
                                  {category.subcategories.map((sub) => (
                                    <li key={sub.id}>
                                      <label className="mm-filter-tree__option">
                                        <input
                                          className="mm-filter-tree__input"
                                          type="checkbox"
                                          checked={selectedFilters.subcategories.includes(sub.id)}
                                          onChange={() => toggleFilter("subcategories", sub.id)}
                                        />
                                        <span className="mm-filter-tree__name">{truncateWords(sub.name)}</span>
                                        <span className="mm-filter-tree__count">{sub.count}</span>
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
      </section>
    )}

    {filters.brands?.length > 0 && (
      <section className="mm-filter-tree__group">
        <h4 className="mm-filter-tree__section-title">Brands</h4>
        <ul className="mm-filter-tree__options">
          {filters.brands.map((brand) => (
            <li key={brand.id}>
              <label className="mm-filter-tree__option">
                <input
                  className="mm-filter-tree__input"
                  type="checkbox"
                  checked={selectedFilters.brands.includes(brand.id)}
                  onChange={() => toggleFilter("brands", brand.id)}
                />
                <span className="mm-filter-tree__name">{truncateWords(brand.name)}</span>
                <span className="mm-filter-tree__count">{brand.count}</span>
              </label>
            </li>
          ))}
        </ul>
      </section>
    )}

    {filters.colors?.length > 0 && (
      <section className="mm-filter-tree__group">
        <h4 className="mm-filter-tree__section-title">Colors</h4>
        <div className="mm-filter-tree__color-options">
          {filters.colors.map((color) => (
            <label key={color} className="mm-filter-tree__color-option">
              <input
                className="mm-filter-tree__input"
                type="radio"
                name="category-color"
                checked={selectedFilters.color === color}
                onChange={() => toggleFilter("color", color)}
              />
              <span>{color}</span>
            </label>
          ))}
        </div>
      </section>
    )}

    <section className="mm-filter-tree__group">
      <h4 className="mm-filter-tree__section-title">Price</h4>
      <input
        type="range"
        min={filters.priceRange?.min || 0}
        max={filters.priceRange?.max || 150000}
        value={selectedFilters.priceRange[1]}
        onChange={(e) => toggleFilter("priceRange", [0, parseInt(e.target.value, 10)])}
        className="mm-filter-tree__price-range"
        aria-label="Maximum price"
      />
      <div className="mm-filter-tree__price-value">
        <span>KES {selectedFilters.priceRange[0]}</span>
        <span>KES {selectedFilters.priceRange[1]}</span>
      </div>
    </section>
  </div>
);

export default FilterTree;
