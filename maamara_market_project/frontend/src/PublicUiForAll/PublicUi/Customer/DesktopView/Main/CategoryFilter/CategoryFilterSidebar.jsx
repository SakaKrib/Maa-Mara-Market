import React from "react";
import FilterTree from "./FilterTree";

const CategoryFilterSidebar = ({ filters, selectedFilters, toggleFilter }) => (
  <aside className="mm-filter-sidebar">
    <h3 className="mm-filter-sidebar__title">Filters</h3>
    <div className="mm-filter-sidebar__scroll max-h-[55vh] lg:max-h-[70vh] overflow-y-auto pr-1">
      <FilterTree filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
    </div>
  </aside>
);

export default CategoryFilterSidebar;
