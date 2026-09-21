import { useCallback, useEffect, useState } from "react";
import api from "../../../../../../Services/Api";

const emptySections = {
  personalized: [],
  search_related: [],
  popular: [],
  best_selling: [],
};

const useTrendingProducts = () => {
  const [items, setItems] = useState([]);
  const [sections, setSections] = useState(emptySections);
  const [collections, setCollections] = useState([]);
  const [metadata, setMetadata] = useState({
    has_activity: false,
    has_search_history: false,
    has_purchase_history: false,
    recent_search: null,
  });
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);

    try {
      const [recommendationsResult, collectionsResult] = await Promise.allSettled([
        api.get("/api/recommendations/", { params: { limit: 6 } }),
        api.get("/api/homepage-collections/", { params: { items: 6, sections: 8 } }),
      ]);

      const data =
        recommendationsResult.status === "fulfilled"
          ? recommendationsResult.value.data || {}
          : {};

      const collectionData =
        collectionsResult.status === "fulfilled" && Array.isArray(collectionsResult.value.data)
          ? collectionsResult.value.data
          : [];

      const nextSections = {
        personalized: Array.isArray(data.personalized) ? data.personalized : [],
        search_related: Array.isArray(data.search_related) ? data.search_related : [],
        popular: Array.isArray(data.popular) ? data.popular : [],
        best_selling: Array.isArray(data.best_selling) ? data.best_selling : [],
      };

      setSections(nextSections);
      setCollections(collectionData);
      setItems(nextSections.popular);
      setMetadata({
        has_activity: Boolean(data.has_activity),
        has_search_history: Boolean(data.has_search_history),
        has_purchase_history: Boolean(data.has_purchase_history),
        recent_search: data.recent_search || null,
      });
    } catch {
      setSections(emptySections);
      setCollections([]);
      setItems([]);
      setMetadata({
        has_activity: false,
        has_search_history: false,
        has_purchase_history: false,
        recent_search: null,
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const updateItemStock = useCallback((itemId, newStock) => {
    const update = (current) =>
      current.map((item) =>
        item.id === itemId ? { ...item, in_stock: newStock } : item
      );

    setItems(update);
    setSections((current) => ({
      personalized: update(current.personalized),
      search_related: update(current.search_related),
      popular: update(current.popular),
      best_selling: update(current.best_selling),
    }));
  }, []);

  return {
    items,
    sections,
    collections,
    metadata,
    loading,
    nextUrl: null,
    prevUrl: null,
    fetchItems,
    updateItemStock,
  };
};

export default useTrendingProducts;
