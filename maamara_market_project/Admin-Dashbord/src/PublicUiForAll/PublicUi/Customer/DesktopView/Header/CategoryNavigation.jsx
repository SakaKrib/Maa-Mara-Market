import React, { useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import { chevronDownOutline, chevronForwardOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { useCategories } from "./SectionHook";

const CategoryNavigation = () => {
  const { data, loading } = useCategories();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);

  const departments = useMemo(() => {
    const section =
      data?.sections?.find((item) =>
        ["departmental", "general"].includes(item?.name?.toLowerCase())
      ) || data?.sections?.[0];

    return section?.departments || [];
  }, [data]);

  const goToCategory = (categoryId) => {
    setOpen(false);
    navigate(categoryId ? `/filter-category?category=${categoryId}` : "/filter-category");
  };

  return (
    <div className="mm-category-nav">
      <div className="mm-container">
        <div className="mm-category-nav-inner">
          <button
            type="button"
            className={`mm-category-trigger ${open ? "is-open" : ""}`}
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
          >
            <span className="mm-category-trigger-icon">☰</span>
            <span>Browse categories</span>
            <IonIcon icon={chevronDownOutline} />
          </button>

          <nav className="mm-category-links" aria-label="Product categories">
            {departments.slice(0, 7).map((department) => (
              <button
                type="button"
                key={department.id}
                onClick={() => {
                  setActiveDepartment(department.id);
                  setOpen(true);
                }}
                className="mm-category-link"
              >
                {department.name}
              </button>
            ))}
          </nav>
        </div>

        {open && (
          <div className="mm-category-panel" role="dialog" aria-label="Browse categories">
            <div className="mm-category-panel-head">
              <div>
                <strong>Shop by category</strong>
                <span>Explore the marketplace by department.</span>
              </div>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close categories">×</button>
            </div>

            {loading ? (
              <div className="mm-category-loading">Loading categories…</div>
            ) : (
              <div className="mm-category-panel-grid">
                <aside className="mm-department-list" aria-label="Departments">
                  {departments.map((department) => (
                    <button
                      type="button"
                      key={department.id}
                      className={activeDepartment === department.id ? "active" : ""}
                      onMouseEnter={() => setActiveDepartment(department.id)}
                      onFocus={() => setActiveDepartment(department.id)}
                      onClick={() => {
                        setActiveDepartment(department.id);
                        if (!department.categories?.length) navigate("/filter-category");
                      }}
                    >
                      <span>{department.name}</span>
                      <IonIcon icon={chevronForwardOutline} />
                    </button>
                  ))}
                </aside>

                <div className="mm-category-results">
                  {(departments.find((item) => item.id === activeDepartment) || departments[0])?.categories?.map((category) => (
                    <section key={category.id} className="mm-category-column">
                      <button type="button" onClick={() => goToCategory(category.id)} className="mm-category-title">
                        {category.name}
                      </button>
                      <ul>
                        {(category.subcategories || []).slice(0, 8).map((subcategory) => (
                          <li key={subcategory.id}>
                            <button type="button" onClick={() => {
                              setOpen(false);
                              navigate(`/subcategory/${subcategory.id}/products`);
                            }}>
                              {subcategory.name}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </section>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CategoryNavigation;
