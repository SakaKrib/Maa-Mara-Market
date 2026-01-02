import React from "react";
import { useCategories } from "./SectionHook";
import { useNavigate } from "react-router-dom";

export default function MegaMenuChildren() {
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

  // Find Fashion/Apparel department
  const fashionDept = departmentalSection?.departments?.find(
    (dept) =>
      dept.name?.toLowerCase().includes("fashion") ||
      dept.name?.toLowerCase().includes("apparel")
  );

  // if (!fashionDept) return <div>No fashion department found</div>;

  // ---- FILTER: Children's Clothing ONLY ----
  const childrensClothingCategory = fashionDept?.categories?.find(
    (cat) =>
      cat.name?.toLowerCase() === "children's clothing" ||
      cat.name?.toLowerCase().startsWith("children") ||
      cat.name?.toLowerCase().startsWith("kids")
  );

  // Children Shoes
  const childrenShoesCat = fashionDept?.categories?.find((cat) =>
    cat.name?.toLowerCase().includes("children's shoes")
  );

  return (
    <div className="mega">
      <div className="container">
        <div className="wrapper">

          {/* Children Clothing */}
          {childrensClothingCategory && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className="text-lg">{childrensClothingCategory.name}</h4>
                <ul>
                  {childrensClothingCategory.subcategories?.map((subcat) => (
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

          {/* Children Shoes */}
          {childrenShoesCat && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className="text-lg">{childrenShoesCat.name}</h4>
                <ul>
                  {childrenShoesCat.subcategories?.map((subcat) => (
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
              <ul className="children-brands">
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

          {/* Static product preview */}
          <div className="flexcol products">
            <div className="flex flex-col">
              <div className="media">
                <div className="thumbnail object-cover">
                  <a href="#">
                    <img
                      src="products/kuba wall hanging.jpg"
                      alt="Kuba Wall Hanging"
                    />
                  </a>
                </div>
              </div>
              <div className="text-content">
                <h4>Most Viewed</h4>
                <a href="#" className="primary-button">
                  Add to cart
                </a>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
