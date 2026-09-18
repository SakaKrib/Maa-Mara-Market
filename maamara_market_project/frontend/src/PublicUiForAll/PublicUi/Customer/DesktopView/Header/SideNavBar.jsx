import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCategories } from "./SectionHook";

export default function HoverCategoryMenu() {
  const { data, loading, error } = useCategories();
  const navigate = useNavigate();

  const [activeDept, setActiveDept] = useState(null);
  const [activeCat, setActiveCat] = useState(null);

  const handlecategoryclick = () => {
    navigate("/filter-category");
  };

  if (loading || error || !data?.sections) return null;

  const departmentalSection =
    data.sections.find((s) =>
      ["departmental", "general"].includes(s.name?.toLowerCase())
    ) || data.sections[0];

  const departments = departmentalSection?.departments || [];

  return (
    <div style={{ width: "100%", position:'absolute' }} className="bg-gray-100">
      <ul style={{ listStyle: "none", padding: 0 }}>

        {/* FILTER */}
        <li
          style={{ cursor: "pointer", padding: "10px", textAlign: "center" }}
          className="hover:underline-blue-500"
          onClick={handlecategoryclick}
        >
          <i className="ri-user-6-line"></i> Filter Categories
        </li>

        {/* HEADER */}
        <li style={{ background: "#eee", padding: "10px", textAlign: "center" }}>
          <i className="ri-menu-line"></i> Departments
        </li>

        {/* ================= DEPARTMENTS ================= */}
        {departments.map((dept) => (
          <li
            key={dept.id}
            style={{ position: "relative", textAlign: "center" }}
            onMouseEnter={() => {
              setActiveDept(dept.id);
              setActiveCat(true);
            }}
          >
            {/* DEPARTMENT */}
            <div style={{ padding: "10px", cursor: "pointer" }}>
              <i className="ri-building-line"></i> {dept.name}
            </div>

            {/* ================= CATEGORY PANEL ================= */}
            {activeDept === dept.id && (
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  left: "100%",
                  background: "#fff",
                  border: "1px solid #ddd",
                  zIndex: 1000,
                  display: "flex",            // ✅ KEY FIX
                  minWidth: "600px",          // wider horizontal menu
                }}
                onMouseLeave={() => {
                  setActiveDept(null);
                  setActiveCat(null);
                }}
              >
                {/* CATEGORY LIST */}
                <ul
                  style={{
                    listStyle: "none",
                    margin: 0,
                    padding: 0,
                    display: "flex",         // ✅ horizontal categories
                    gap: "20px",
                  }}
                >
                  {dept.categories?.map((cat) => (
                    <li
                      key={cat.id}
                      style={{
                        position: "relative",
                        padding: "10px",
                        cursor: "pointer",
                        width: "max-content",
                      }}
                      onMouseEnter={() => setActiveCat(cat.id)}
                    >
                      <div className="w-fit">{cat.name}</div>

                      {/* ================= SUBCATEGORY PANEL ================= */}
                      {activeCat === cat.id && (
                        <div
                          style={{
                            position: "absolute",
                            top: "100%",
                            left: 0,
                            background: "#fff",
                            border: "1px solid #ddd",
                            zIndex: 1100,
                            minWidth: "200px",
                            padding: "10px",
                          }}
                          onMouseLeave={() => setActiveCat(null)}
                        >
                          <ul
                            style={{
                              listStyle: "none",
                              margin: 0,
                              padding: 0,
                              display: "flex",   // ✅ horizontal subcategories
                              flexDirection: "column",
                              gap: "6px",
                            }}
                          >
                            {cat.subcategories?.map((sub) => (
                              <li key={sub.id}>
                                <button
                                  style={{
                                    width: "100%",
                                    textAlign: "left",
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                  }}
                                  onClick={() =>
                                    navigate(`/subcategory/${sub.id}/products`)
                                  }
                                >
                                  {sub.name}
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}