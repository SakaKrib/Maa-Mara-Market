import React from "react";
import { useCategories } from "./SectionHook";
import { useNavigate } from "react-router-dom";

export default function MegaMenu() {
  const { data, loading, error } = useCategories();




  // if (loading) return <div>Loading...</div>;
  // if (error) return <div>Error: {error}</div>;

  // if (!data?.sections) return <div>No sections found</div>;

  // Adjust the section name as per your data, e.g. "general" or "departmental"
  const departmentalSection =
    data.sections.find((s) =>
      ["departmental", "general"].includes(s.name?.toLowerCase())
    ) || data.sections[0]; // fallback to first section if none matches

  const brands = data.brands ?? [];

  // Find Women's Clothing department (fashion/apparel)
  const womensClothingDept = departmentalSection?.departments?.find(
    (dept) =>
      dept.name?.toLowerCase().includes("fashion") ||
      dept.name?.toLowerCase().includes("apparel")
  );

  // Find Women's Clothing category under the department
  const womensClothingCategory = womensClothingDept?.categories?.find((cat) =>
    cat.name?.toLowerCase().includes("women")
  );

  // Find Accessories category
  const accessoriesCat = womensClothingDept?.categories?.find((cat) =>
    cat.name?.toLowerCase().includes("accessories")
  );

  // Find Shoes category
  const shoesCat = womensClothingDept?.categories?.find((cat) =>
    cat.name?.toLowerCase().includes("shoes")
  );

  return (
    <div className="mega">
      <div className="container">
        <div className="wrapper">
          {/* Women's Clothing with subcategories */}
          {womensClothingCategory && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className='text-lg'>{womensClothingCategory.name}</h4>
                <ul>
                  {womensClothingCategory.subcategories?.map((subcat) => (
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

          {/* Jewelry - Accessories category */}
          {accessoriesCat && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className='text-lg'>Jewelry</h4>
                <ul>
                  {accessoriesCat.subcategories?.map((subcat) => (
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

          {/* Beauty & Cosmetics */}
          {departmentalSection?.departments
            ?.filter((dept) => dept.name?.toLowerCase().includes("beauty"))
            .map((beautyDept) => (
              <div className="flexcol" key={beautyDept.id}>
                <div className="flex flex-col">
                  <h4 className='text-lg'>Beauty & Cosmetics</h4>
                  <ul className="grid">
                    {beautyDept.categories?.flatMap((cat) =>
                      cat.subcategories?.map((subcat) => (
                      <li className="flex flex-col w-max" key={subcat.id}>
                     <button
                       onClick={() => handleNavigateSubcategory(subcat.id)}
                       className="text-left hover:underline"
                     >
                       {subcat.name}
                     </button>

                   </li>
                      ))
                    )}
                  </ul>
                </div>
              </div>
            ))}

          {/* Women Footwear (Shoes category) */}
          {shoesCat && (
            <div className="flexcol">
              <div className="flex flex-col">
                <h4 className='text-lg'>Women Foot Wear</h4>
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

          {/* Brands Section */}
          <div className="flexcol">
            <div className="flex flex-col">
              <h4 className='text-lg'>Brands</h4>
              <ul className="women-brands">
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

          {/* Most Viewed (static) */}
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
