import { useEffect, useState } from "react";
import api from "../../../../../../Services/Api";

// Running offers, already grouped by the duration the vendor chose.
// Several homepage rails share one request: the response is cached briefly and
// concurrent callers wait for the same promise.
const CACHE_MS = 60 * 1000;
const cache = { limit: null, at: 0, promise: null, groups: null };

const loadGroups = (limit) => {
  const fresh = cache.groups && cache.limit === limit && Date.now() - cache.at < CACHE_MS;
  if (fresh) return Promise.resolve(cache.groups);
  if (cache.promise && cache.limit === limit) return cache.promise;
  cache.limit = limit;
  cache.promise = api
    .get("/api/homepage-offers/", { params: { limit } })
    .then((response) => {
      const groups = Array.isArray(response.data?.groups) ? response.data.groups : [];
      cache.groups = groups;
      cache.at = Date.now();
      return groups;
    })
    .catch(() => [])
    .finally(() => {
      cache.promise = null;
    });
  return cache.promise;
};

const useHomepageOffers = (limit = 6) => {
  const [groups, setGroups] = useState(() => (cache.groups && cache.limit === limit ? cache.groups : []));

  useEffect(() => {
    let cancelled = false;
    loadGroups(limit).then((result) => {
      if (!cancelled) setGroups(result);
    });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  return groups;
};

export default useHomepageOffers;
