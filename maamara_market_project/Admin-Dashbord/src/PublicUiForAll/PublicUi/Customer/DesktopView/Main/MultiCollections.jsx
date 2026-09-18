import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../Services/Api";
import { baseUrl } from "../../../../../cmponents/Constant/Constant";

const resolveImage = (value) => {
  if (!value) return "/placeholder.jpg";
  return value.startsWith?.("http") ? value : `${baseUrl || ""}${value}`;
};

const MultiCollections = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    api.get("/api/items/")
      .then((res) => {
        if (!active) return;
        const data = Array.isArray(res.data) ? res.data : res.data?.results || [];
        setItems(data.filter((item) => item?.id && item?.image).slice(0, 18));
      })
      .catch(() => {
        if (active) setItems([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, []);

  if (!loading && !items.length) return null;

  const collections = Array.from({ length: 3 }, (_, index) =>
    items.slice(index * 6, index * 6 + 6)
  ).filter((collection) => collection.length);

  return (
    <section className="multi-collections mm-section">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div>
            <h2>Explore Collections</h2>
            <p>Discover products currently available on Maa Mara Market.</p>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" aria-label="Loading collections">
            {[0, 1, 2].map((index) => (
              <div key={index} className="mm-card h-64 animate-pulse bg-gray-100" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {collections.map((collection, collectionIndex) => (
              <article key={collectionIndex} className="mm-card mm-card-interactive overflow-hidden p-2">
                <div className="grid grid-cols-3 gap-1 aspect-[3/2]">
                  {collection.map((item) => (
                    <Link key={item.id} to={`/item/${item.id}`} className="block overflow-hidden rounded-md bg-gray-100">
                      <img
                        src={resolveImage(item.image)}
                        alt={item.name || "Marketplace product"}
                        className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                        loading="lazy"
                      />
                    </Link>
                  ))}
                </div>
                <h3 className="px-2 pt-3 pb-2 text-base font-semibold">
                  Collection {collectionIndex + 1}
                </h3>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MultiCollections;