import React from "react";
import { useCategories } from "./SectionHook";
import { useNavigate } from "react-router-dom";

export default function MegaMenuMen() {
  const { data, loading, error } = useCategories();
  const navigate = useNavigate()

  const handleNavigateSubcategory = (subcategoryId) => {
    navigate(`/subcategory/${subcategoryId}/products`);
  };
  

  // if (loading) return <div>Loading...</div>;
  // if (error) return <div>Error: {error}</div>;
  // if (!data?.sections) return <div>No sections found</div>;

  // Pick departmental/general section
  const departmentalSection =
    data.sections.find((s) =>
      ["departmental", "general"].includes(s.name?.toLowerCase())
    ) || data.sections[0];

  const brands = data.brands ?? [];

  // Find Fashion / Apparel department
  const fashionDept = departmentalSection?.departments?.find(
    (dept) =>
      dept.name?.toLowerCase().includes("fashion") ||
      dept.name?.toLowerCase().includes("apparel")
  );

  // if (!fashionDept) return <div>No fashion department found</div>;

  // ---- FILTER: Men's clothing ONLY ----
  const mensClothingCategory = fashionDept?.categories?.find(
    (cat) =>
      cat.name?.toLowerCase() === "men's clothing" ||
      cat.name?.toLowerCase().startsWith("men")
  );

  // Shoes category if needed
  const shoesCat = fashionDept?.categories?.find((cat) =>
    cat.name?.toLowerCase().includes("shoes")
  );

  return (
    <div className="mega">
      <div className="container">
        <div className="wrapper">

          {/* Men's Clothing */}
          {mensClothingCategory && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className="text-lg">{mensClothingCategory.name}</h4>
                <ul>
                  {mensClothingCategory.subcategories?.map((subcat) => (
                    <li key={subcat.id}>
                      <button
                        onClick={() => handleNavigateSubcategory(subcat.id)}
                        className="text-left hover:underline"
                      >
                        {subcat.name}
                      </button>

                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Shoes */}
          {shoesCat && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className="text-lg">{shoesCat.name}</h4>
                <ul>
                  {shoesCat.subcategories?.map((subcat) => (
                     <li key={subcat.id}>
                     <button
                       onClick={() => handleNavigateSubcategory(subcat.id)}
                       className="text-left hover:underline"
                     >
                       {subcat.name}
                     </button>

                   </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Brands */}
          <div className="flexcol">
            <div className="flex flex-col">
              <h4 className="text-lg">Brands</h4>
              <ul className="men-brands">
                {brands.map((brand) => (
                  <li key={brand.id}>
                    <a href="#">{brand.name}</a>
                  </li>
                ))}
              </ul>
              <a href="#" className="view-all">
                View all Brands <i className="ri-arrow-right-line"></i>
              </a>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
