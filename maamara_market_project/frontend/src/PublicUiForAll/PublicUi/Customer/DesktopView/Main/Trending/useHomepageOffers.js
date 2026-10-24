import { useEffect, useState } from "react";
import api from "../../../../../../Services/Api";

// Running offers, already grouped by the duration the vendor chose.
const useHomepageOffers = (limit = 6) => {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    let cancelled = false;
    api
      .get("/api/homepage-offers/", { params: { limit } })
      .then((response) => {
        if (!cancelled) setGroups(Array.isArray(response.data?.groups) ? response.data.groups : []);
      })
      .catch(() => {
        if (!cancelled) setGroups([]);
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return groups;
};

export default useHomepageOffers;
