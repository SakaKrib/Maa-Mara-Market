import React from "react";
import FilterTree from "./FilterTree";

const CategoryFilterSidebar = ({ filters, selectedFilters, toggleFilter }) => (
  <aside className="w-full lg:w-1/4 p-4 border lg:border-r space-y-6 bg-gray-50 rounded-xl lg:rounded-none lg:bg-gray-100">
    <h3 className="font-bold border-b pb-2">Filters</h3>
    <div className="max-h-[55vh] lg:max-h-[70vh] overflow-y-auto pr-1">
      <FilterTree filters={filters} selectedFilters={selectedFilters} toggleFilter={toggleFilter} />
    </div>
  </aside>
);

export default CategoryFilterSidebar;
