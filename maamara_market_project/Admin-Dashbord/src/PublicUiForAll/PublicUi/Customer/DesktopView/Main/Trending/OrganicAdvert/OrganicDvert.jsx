import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../../Services/Api";
import { baseUrl } from "../../../../../../../cmponents/Constant/Constant";

const resolveImage = (value) => {
  if (!value) return null;
  return value.startsWith?.("http") ? value : `${baseUrl || ""}${value}`;
};

const OrganicSlideshow = () => {
  const [items, setItems] = useState([]);
  const [current, setCurrent] = useState(0);
  const timeoutRef = useRef(null);

  useEffect(() => {
    let active = true;
    api.get("/api/items/")
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setItems(data.filter((item) => item?.is_organic && item?.image));
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (items.length <= 1) return undefined;
    timeoutRef.current = setTimeout(() => {
      setCurrent((prev) => (prev + 1) % items.length);
    }, 6000);
    return () => clearTimeout(timeoutRef.current);
  }, [current, items.length]);

  useEffect(() => {
    if (current >= items.length) setCurrent(0);
  }, [current, items.length]);

  if (!items.length) return null;

  return (
    <section className="mm-section" aria-label="Organic products">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div>
            <h2>Organic products</h2>
            <p>Fresh products currently available from Maa Mara Market sellers.</p>
          </div>
          <Link to="/organic" className="secondary-button">Shop organic</Link>
        </div>

        <div className="relative w-full overflow-hidden rounded-[10px] shadow-lg aspect-[16/7] min-h-[280px]">
          {items.map((item, index) => (
            <Link
              key={item.id}
              to={`/item/${item.id}`}
              className={`absolute inset-0 transition-opacity duration-1000 ${index === current ? "opacity-100 z-10" : "opacity-0 z-0"}`}
              aria-hidden={index !== current}
            >
              <img
                src={resolveImage(item.image)}
                alt={item.name || "Organic product"}
                className="w-full h-full object-cover"
                loading={index === 0 ? "eager" : "lazy"}
              />
              <div className="absolute inset-x-0 bottom-0 bg-black/55 px-4 py-4 text-white">
                <h3 className="text-lg md:text-2xl font-semibold">{item.name}</h3>
                <p className="text-sm opacity-90">View product</p>
              </div>
            </Link>
          ))}

          {items.length > 1 && (
            <div className="absolute bottom-4 right-4 z-20 flex gap-2">
              {items.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setCurrent(index)}
                  className={`h-2.5 w-2.5 rounded-full border border-white ${index === current ? "bg-white" : "bg-white/40"}`}
                  aria-label={`Show ${item.name || "organic product"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default OrganicSlideshow;
