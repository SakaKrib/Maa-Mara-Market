import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

const VERIFIED_HOST = "maamaramarket.com";

function routeFromUrl(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== VERIFIED_HOST) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

/**
 * Sends verified Android App Links into React Router while the web build
 * naturally continues to use the same canonical URLs in the browser.
 */
export default function AndroidAppLinksBridge() {
  const navigate = useNavigate();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;

    let active = true;
    let listenerHandle;

    const openInsideApp = (url) => {
      const route = routeFromUrl(url);
      if (active && route) navigate(route, { replace: true });
    };

    CapacitorApp.addListener("appUrlOpen", ({ url }) => openInsideApp(url))
      .then((handle) => {
        if (active) listenerHandle = handle;
        else handle.remove();
      })
      .catch((error) => {
        console.warn("Android App Links listener could not be registered:", error);
      });

    CapacitorApp.getLaunchUrl()
      .then((launch) => {
        if (active && launch?.url) openInsideApp(launch.url);
      })
      .catch((error) => {
        console.warn("Could not read the initial Android App Link:", error);
      });

    return () => {
      active = false;
      listenerHandle?.remove();
    };
  }, [navigate]);

  return null;
}
