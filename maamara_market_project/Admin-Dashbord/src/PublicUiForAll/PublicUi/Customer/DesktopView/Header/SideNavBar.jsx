import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "./SectionHook";
import { Link } from "react-router-dom";

export default function HoverCategoryMenu() {
  const { data, loading, error } = useCategories();
  const [hoverDept, setHoverDept] = useState(null);
  const [hoverCat, setHoverCat] = useState(null);
  const navigate = useNavigate();

  const handlecategoryclick = () => {
    navigate('/filter-category')
  }

  if (loading) return null;
  if (error) return null;
  if (!data?.sections) return null;


  const departmentalSection =
    data.sections.find((s) =>
      ["departmental", "general"].includes(s.name?.toLowerCase())
    ) || data.sections[0];

  const departments = departmentalSection?.departments || [];

  return (
    <div className="dtp-menu">
      <ul className="second-links w-full">

        {/* STATIC FILTER OPTION */}
        <li className="relative cursor-pointer" onClick={handlecategoryclick}>
         
            <div className="icon-large"><i className="ri-user-6-line"></i></div>
           Filter Categories
          
        </li>

        {/* TOP LEVEL LABEL */}
        <li className="bg-gray-200 w-full mt-2 items-center">
          <span className="">
            <div className="icon-large"><i className="ri-menu-line"></i></div>
            Departments
          </span>
        </li>

        {/* ----------------------------- */}
        {/*        DEPARTMENTS LEVEL      */}
        {/* ----------------------------- */}
        {departments.map((dept) => (
          <li
            key={dept.id}
            className="has-child flex flex-col w-full "
            onMouseEnter={() => setHoverDept(dept.id)}
            onMouseLeave={() => {
              setHoverDept(null);
              setHoverCat(null);
            }}
          >
            <span className="cat-label">
              <div className="icon-large"><i className="ri-building-line"></i></div>
              {dept.name}
              <div className="icon-small"><i className="ri-arrow-right-s-line"></i></div>
            </span>

            {/* CATEGORY DROPDOWN */}
            {hoverDept === dept.id && dept.categories?.length > 0 && (
              <ul className="hover-submenu">

                <h4 className="mobile-hide text-lg">{dept.name}</h4>

                {dept.categories.map((cat) => (
                  <li
                    key={cat.id}
                    onMouseEnter={() => setHoverCat(cat.id)}
                    onMouseLeave={() => setHoverCat(null)}
                    className="has-child w-full"
                  >
                    <span className="cat-label">
                      {cat.name}
                      <div className="icon-small"><i className="ri-arrow-right-s-line"></i></div>
                    </span>

                    {/* SUBCATEGORY LEVEL */}
                    {hoverCat === cat.id && cat.subcategories?.length > 0 && (
                      <ul
                      className="
                        hover-submenu second-level
                        
                      "
                    >
                      <h4 className="mobile-hide text-lg col-span-2 mb-2 ">{cat.name}</h4>
                      <div className="columns-5
                        gap-4
                        min-h-[350px]
                        overflow-hidden
                        w-full
                        -right-4
                        p-2">
                    
                      {cat.subcategories.map((sub) => (
                        <li key={sub.id} className="w-full mb-1">
                          <button
                            className="text-left hover:underline w-max"
                            onClick={() => navigate(`/subcategory/${sub.id}/products`)}
                          >
                            {sub.name}
                          </button>
                        </li>
                      ))}
                      </div>
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
  );
}
