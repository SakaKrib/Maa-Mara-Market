import { useCallback, useEffect, useRef, useState } from "react";
import api from "../../../../../../Services/Api";
import { getWebSocketUrl } from "../../../../../../Services/Api";

const useMarketplaceDiscovery = () => {
  const [feed, setFeed] = useState({ popular: [], trending: [], most_wanted: [], best_selling: [], featured: [], occasion_collections: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const refreshTimer = useRef(null);

  const fetchFeed = useCallback(async () => {
    try {
      setError(null);
      const response = await api.get("/api/discovery/?limit=8");
      setFeed({
        popular: response.data?.popular || [],
        trending: response.data?.trending || [],
        most_wanted: response.data?.most_wanted || [],
        best_selling: response.data?.best_selling || [],
        featured: response.data?.featured || [],
        occasion_collections: response.data?.occasion_collections || [],
      });
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFeed();
    refreshTimer.current = setInterval(fetchFeed, 60000);
    return () => clearInterval(refreshTimer.current);
  }, [fetchFeed]);

  useEffect(() => {
    const socket = new WebSocket(getWebSocketUrl("/ws/realtime/"));

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        if (message?.type === "realtime.event" && message?.event === "catalog_activity") {
          fetchFeed();
        }
      } catch {
        // Ignore malformed realtime messages.
      }
    };

    return () => socket.close();
  }, [fetchFeed]);

  return { feed, loading, error, refresh: fetchFeed };
};

export default useMarketplaceDiscovery;
