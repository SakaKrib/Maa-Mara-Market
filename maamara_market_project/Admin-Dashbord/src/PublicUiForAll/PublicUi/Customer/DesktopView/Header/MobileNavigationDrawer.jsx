import React, { useEffect, useMemo, useState } from "react";
import { IonIcon } from "@ionic/react";
import { chevronForwardOutline, closeOutline } from "ionicons/icons";
import { useNavigate } from "react-router-dom";
import { useCategories } from "./SectionHook";

const MobileNavigationDrawer = ({ open, onClose }) => {
  const { data, loading } = useCategories();
  const navigate = useNavigate();
  const [expandedDepartment, setExpandedDepartment] = useState(null);

  const departments = useMemo(() => {
    const section = data?.sections?.find((item) =>
      ["departmental", "general"].includes(item?.name?.toLowerCase())
    ) || data?.sections?.[0];
    return section?.departments || [];
  }, [data]);

  useEffect(() => {
    if (!open) { setExpandedDepartment(null); return; }
    const handleEscape = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", handleEscape); document.body.style.overflow = ""; };
  }, [open, onClose]);

  const go = (path) => { onClose(); navigate(path); };

  return (
    <>
      <div className={"mm-mobile-drawer-backdrop " + (open ? "is-open" : "")} onClick={onClose} aria-hidden={!open} />
      <aside className={"mm-mobile-drawer " + (open ? "is-open" : "")} aria-hidden={!open} aria-label="Mobile navigation">
        <div className="mm-mobile-drawer-head">
          <strong>Maa Mara Market</strong>
          <button type="button" onClick={onClose} aria-label="Close menu"><IonIcon icon={closeOutline} /></button>
        </div>
        <nav className="mm-mobile-drawer-nav">
          <button type="button" onClick={() => go("/")}>Home</button>
          <button type="button" onClick={() => go("/list")}>Shop</button>
          <div className="mm-mobile-drawer-section">
            <div className="mm-mobile-drawer-section-title">Categories</div>
            {loading ? <div className="mm-mobile-drawer-loading">Loading categories…</div> : departments.length === 0 ?
              <button type="button" onClick={() => go("/filter-category")}>Browse categories</button> :
              departments.map((department) => (
                <div key={department.id} className="mm-mobile-department">
                  <button type="button" className="mm-mobile-department-trigger" onClick={() => setExpandedDepartment((value) => value === department.id ? null : department.id)}>
                    <span>{department.name}</span><IonIcon icon={chevronForwardOutline} />
                  </button>
                  {expandedDepartment === department.id && <div className="mm-mobile-category-list">
                    {(department.categories || []).map((category) => <div key={category.id}>
                      <button type="button" className="mm-mobile-category" onClick={() => go("/filter-category?category=" + category.id)}>{category.name}</button>
                      {(category.subcategories || []).slice(0, 8).map((subcategory) => <button type="button" key={subcategory.id} className="mm-mobile-subcategory" onClick={() => go("/subcategory/" + subcategory.id + "/products")}>{subcategory.name}</button>)}
                    </div>)}
                  </div>}
                </div>
              ))}
          </div>
          <button type="button" onClick={() => go("/blogs")}>Journal</button>
          <button type="button" onClick={() => go("/organic")}>Organic</button>
          <button type="button" onClick={() => go("/user-account")}>My account</button>
          <button type="button" onClick={() => go("/shopping-cart")}>Cart</button>
          <button type="button" onClick={() => go("/customer-login")}>Sign in</button>
        </nav>
      </aside>
    </>
  );
};

export default MobileNavigationDrawer;