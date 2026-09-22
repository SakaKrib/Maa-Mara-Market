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
    if (SEARCH_HOSTS.some((value) => host.includes(value))) return host.includes("google.") ? "google" : "search";
    if (SOCIAL_HOSTS.some((value) => host === value || host.endsWith(`.${value}`))) return "social";
    return host || "referral";
  } catch {
    return "direct";
  }
};

const AnalyticsTracker = () => {
  const location = useLocation();
  const sessionIdRef = useRef(null);
  const firstPageRef = useRef(true);

  useEffect(() => {
    sessionIdRef.current = sessionIdRef.current || getSessionId();

    const url = new URL(window.location.href);
    const referrer = document.referrer || "";
    const params = url.searchParams;

    const payload = {
      path: `${location.pathname}${location.search}`,
      referrer,
      source: params.get("utm_source") || (referrer ? classifySource(referrer) : "direct"),
      medium: params.get("utm_medium") || "",
      campaign: params.get("utm_campaign") || "",
      session_id: sessionIdRef.current,
      event_type: firstPageRef.current ? "session_start" : "page_view",
    };

    api.post("/api/traffic/record/", payload).catch(() => {
      // Analytics must never interfere with storefront navigation.
    });

    firstPageRef.current = false;
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsTracker;
