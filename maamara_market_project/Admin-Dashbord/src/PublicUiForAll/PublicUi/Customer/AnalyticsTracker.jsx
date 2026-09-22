import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import api from "../../../Services/Api";

const SOCIAL_HOSTS = ["facebook.com", "instagram.com", "t.co", "x.com", "twitter.com", "linkedin.com", "youtube.com", "tiktok.com"];
const SEARCH_HOSTS = ["google.", "bing.", "duckduckgo.", "yahoo."];

const getSessionId = () => {
  try {
    const key = "maaMaraAnalyticsSessionId";
    const existing = window.sessionStorage.getItem(key);
    if (existing) return existing;

    const id = typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

    window.sessionStorage.setItem(key, id);
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
};

const classifySource = (url) => {
  try {
    const parsed = new URL(url);
    const params = parsed.searchParams;
    if (params.get("utm_source")) return params.get("utm_source").toLowerCase();

    const host = parsed.hostname.toLowerCase();
    if (SEARCH_HOSTS.some((value) => host.includes(value))) {
      return host.includes("google.") ? "google" : "search";
    }

    if (SOCIAL_HOSTS.some((value) => host === value || host.endsWith(`.${value}`))) {
      return "social";
    }

    return host || "referral";
  } catch {
    return "direct";
  }
};

const AnalyticsTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const lastRecordedRouteRef = useRef(null);

  useEffect(() => {
    const recordRoute = async () => {
      const routeKey = `${location.pathname}${location.search}`;

      // React StrictMode can run effects twice during development. Do not
      // turn one browser navigation into two analytics page views.
      if (lastRecordedRouteRef.current === routeKey) return;
      lastRecordedRouteRef.current = routeKey;

      sessionIdRef.current = sessionIdRef.current || getSessionId();

      const url = new URL(window.location.href);
      const referrer = document.referrer || "";
      const params = url.searchParams;

      const payload = {
        path: routeKey || "/",
        referrer,
        source: params.get("utm_source") || (referrer ? classifySource(referrer) : "direct"),
        medium: params.get("utm_medium") || "",
        campaign: params.get("utm_campaign") || "",
        session_id: sessionIdRef.current,
      };

      try {
        // Anonymous visitors receive their existing server-issued visitorId
        // before the first event is recorded. Authenticated users are left
        // untouched by this endpoint.
        await api.get("/api/vistor-token/");

        const sessionStartedKey = "maaMaraAnalyticsSessionStarted";
        const sessionStarted = sessionStorage.getItem(sessionStartedKey) === sessionIdRef.current;

        if (!sessionStarted) {
          sessionStorage.setItem(sessionStartedKey, sessionIdRef.current);
          await api.post("/api/traffic/record/", {
            ...payload,
            event_type: "session_start",
          });
        }

        await api.post("/api/traffic/record/", {
          ...payload,
          event_type: "page_view",
        });
      } catch {
        // Analytics must never interfere with storefront navigation.
      }
    };

    recordRoute();
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;
