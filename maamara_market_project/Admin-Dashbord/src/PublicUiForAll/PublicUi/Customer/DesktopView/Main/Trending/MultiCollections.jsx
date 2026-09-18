import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "../../../../../../Services/Api";
import { baseUrl } from "../../../../../../cmponents/Constant/Constant";

const imageUrl = (value) => !value ? null : value.startsWith?.("http") ? value : (baseUrl || "") + value;

const MultiCollections = () => {
  const [collections, setCollections] = useState([]);

  useEffect(() => {
    let active = true;
    api.get("/api/multi-collections/?items=6")
      .then((res) => {
        if (active) setCollections(Array.isArray(res.data) ? res.data.slice(0, 4) : []);
      })
      .catch(() => active && setCollections([]));
    return () => { active = false; };
  }, []);

  if (!collections.length) return null;

  return (
    <section className="mm-section multi-category-section" aria-label="Explore by department">
      <div className="mm-container">
        <div className="mm-section-heading">
          <div><h2>Explore by category</h2><p>Discover products from different parts of the marketplace.</p></div>
        </div>
        <div className="multi-category-grid">
          {collections.map((collection) => (
            <article className="mm-card multi-category-card" key={collection.id}>
              <div className="multi-category-card__head">
                <div>
                  <h3>{collection.name}</h3>
                  {collection.section && <p>{collection.section}</p>}
                </div>
                <Link className="view-all" to={collection.items?.[0]?.category?.id ? "/category/" + collection.items[0].category.id : "/shop"}>Shop</Link>
              </div>
              <div className="multi-category-card__products">
                {(collection.items || []).slice(0, 6).map((item) => (
                  <Link to={"/item/" + item.id} key={item.id} className="multi-category-tile">
                    <div className="multi-category-tile__image">
                      {item.image && <img src={imageUrl(item.image)} alt={item.name} loading="lazy" />}
                    </div>
                    <span>{item.name}</span>
                  </Link>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default MultiCollections;
