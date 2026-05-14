import React, { useState, useEffect } from 'react';
import { useSearchParams, useLocation, useNavigate } from 'react-router-dom';

const Filter = ({ onFilterChange }) => {
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [filters, setFilters] = useState({
    section: '',
    department: '',
    category: '',
    size: '',
    color: '',
    minPrice: '',
    maxPrice: '',
    sort: '',
  });

  const categoryOptions = [
    "Gift Bundles", "Back to School", "Holiday Decor", "Aquariums & Accessories",
    "Grooming & Care", "Pet Toys", "Sportswear", "Camping & Hiking",
    "Outdoor Gear", "Fitness Equipment", "Car Accessories", "Educational",
    "Kids' Furniture", "Baby Gear", "Toys & Games", "Fragrances",
    "Makeup", "Haircare", "Skincare", "Lighting", "Bedding & Bath",
    "Kitchen & Dining", "Home Decor", "Furniture", "Accessories", "Shoes",
    "Kids & Baby Wear", "Women's Clothing", "Men's Clothing"
  ];

  const updateURLParams = (name, value) => {
    const params = new URLSearchParams(location.search);
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    navigate({ search: params.toString() });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
    updateURLParams(name, value);
  };

  useEffect(() => {
    onFilterChange(filters);
  }, [filters]);

  return (
    <div className="mt-12 flex flex-col md:flex-row md:justify-between gap-6 flex-wrap">
      <div className="flex flex-wrap gap-4 md:gap-6">

        {/* section */}
        <select
            name="section"             
            value={filters.section}     
            onChange={handleChange}
            className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300"
          >
            <option value="">Section</option>
            <option value="general">General</option>  
            <option value="inorganic">Inorganic</option>   
            <option value="organic">Organic</option>    
          </select>


        <select name="department" value={filters.department} onChange={handleChange} className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300">
          <option value="">Department</option>
          <option value="home-decor">Home Decor</option>
          <option value="fashion">Fashion</option>
          <option value="art">Art</option>
          <option value="kitchen">Kitchen</option>
        </select>

        <select name="category" value={filters.category} onChange={handleChange} className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300">
          <option value="">Category</option>
          {categoryOptions.map((category) => (
            <option key={category} value={category}>{category}</option>
          ))}
        </select>

        <select name="size" value={filters.size} onChange={handleChange} className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300">
          <option value="">Size</option>
          <option value="xs">XS</option>
          <option value="s">S</option>
          <option value="m">M</option>
          <option value="l">L</option>
          <option value="xl">XL</option>
          <option value="xxl">XXL</option>
          <option value="oversize">Oversize</option>
        </select>

        <select name="color" value={filters.color} onChange={handleChange} className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300">
          <option value="">Color</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
          <option value="red">Red</option>
          <option value="white">White</option>
          <option value="black">Black</option>
          <option value="yellow">Yellow</option>
          <option value="orange">Orange</option>
          <option value="pink">Pink</option>
          <option value="maroon">Maroon</option>
          <option value="multicolor">Multicolor</option>
          <option value="beige">Beige</option>
          <option value="turquoise">Turquoise</option>
        </select>

        <input
          type="number"
          name="minPrice"
          placeholder="Min Price"
          value={filters.minPrice}
          onChange={handleChange}
          className="text-sm rounded-2xl pl-3 py-2 w-24 ring-1 ring-gray-300 bg-white"
        />

        <input
          type="number"
          name="maxPrice"
          placeholder="Max Price"
          value={filters.maxPrice}
          onChange={handleChange}
          className="text-sm rounded-2xl pl-3 py-2 w-24 ring-1 ring-gray-300 bg-white"
        />
      </div>

      <div className="flex items-center">
        <select name="sort" value={filters.sort} onChange={handleChange} className="py-2 px-3 rounded-2xl text-sm font-medium bg-gray-100 ring-1 ring-gray-300">
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
