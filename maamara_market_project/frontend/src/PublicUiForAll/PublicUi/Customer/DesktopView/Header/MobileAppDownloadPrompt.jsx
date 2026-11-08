import React, { useEffect, useState } from "react";
import { Apple, Download, Smartphone, X } from "lucide-react";
import "./mobile-app-download-prompt.css";
import maamaraBrandArtwork from "@/assets/maamara-brand-artwork.svg";
import api from "../../../../../Services/Api";

const DISMISSED_KEY = "maamara-mobile-app-prompt-dismissed-v1";
const ANDROID_PACKAGE = "com.maamaramarket.app";

// Opens the installed Android app for the page being viewed (falls back to the store link).
function androidOpenInAppUrl(fallbackUrl) {
  const { host, pathname, search, hash } = window.location;
  const fallback = fallbackUrl ? `;S.browser_fallback_url=${encodeURIComponent(fallbackUrl)}` : "";
  return `intent://${host}${pathname}${search}${hash}#Intent;scheme=https;package=${ANDROID_PACKAGE}${fallback};end`;
}

function isMobileChrome() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  return /Android.*Chrome\//i.test(ua) || /(?:iPhone|iPad|iPod).*CriOS\//i.test(ua);
}

function isInstalledWebApp() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)")?.matches === true ||
    window.navigator?.standalone === true
  );
}

const MobileAppDownloadPrompt = ({ isNativeApp = false }) => {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState("android");
  const [installed, setInstalled] = useState(false);
  const [links, setLinks] = useState({ android: "", ios: "" });

  useEffect(() => {
    if (isNativeApp || typeof window === "undefined" || !isMobileChrome()) return undefined;

    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "true") return undefined;
    } catch {
      // Continue without persistence if browser storage is blocked.
    }

    if (isInstalledWebApp()) return undefined;

    let active = true;
    let timer;
    const detectAndShow = async () => {
      const ua = navigator.userAgent || "";
      const onAndroid = /Android/i.test(ua);

      // Store links come from the server's .env (ANDROID_APP_LINK / IOS_APP_LINK).
      let storeLinks = { android: "", ios: "" };
      try {
        const { data } = await api.get("/api/app-links/");
        storeLinks = { android: data?.android || "", ios: data?.ios || "" };
      } catch {
        // Without links there is nothing to offer unless the app is already installed.
      }

      // Chromium reports installed related apps when the site declares them in its
      // web manifest. iOS browsers cannot tell, so iPhone only ever sees the store link.
      let nativeAppIsInstalled = false;
      if (onAndroid && typeof navigator.getInstalledRelatedApps === "function") {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          nativeAppIsInstalled = relatedApps.some((app) => String(app.id || "").toLowerCase() === ANDROID_PACKAGE);
        } catch {
          // Unsupported or not associated: treat as not installed.
        }
      }

      if (!active) return;
      const storeUrl = onAndroid ? storeLinks.android : storeLinks.ios;
      // Nothing useful to show: app not installed and no store link configured yet.
      if (!nativeAppIsInstalled && !storeUrl) return;

      setLinks(storeLinks);
      setInstalled(nativeAppIsInstalled);
      setPlatform(onAndroid ? "android" : "ios");
      timer = window.setTimeout(() => { if (active) setVisible(true); }, 3500);
    };

    detectAndShow();
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [isNativeApp]);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // The current dismissal still applies for this mounted page.
    }
    setVisible(false);
  };

  if (!visible || isNativeApp) return null;

  const isAndroid = platform === "android";
  const storeUrl = isAndroid ? links.android : links.ios;

  return (
    <div className="mm-app-prompt-backdrop" role="presentation" onClick={dismiss}>
      <section
        className="mm-app-prompt"
        role="dialog"
        aria-modal="true"
        aria-labelledby="mm-app-prompt-title"
        aria-describedby="mm-app-prompt-description"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="mm-app-prompt-close"
          aria-label="Dismiss app download prompt"
          onClick={dismiss}
        >
          <X size={19} />
        </button>

        <div className="mm-app-prompt-art" aria-hidden="true">
          <img
            className="mm-app-prompt-logo-image"
            src={maamaraBrandArtwork}
            alt="Maa Mara Market"
            width="98"
            height="98"
            decoding="async"
          />
          <span className="mm-app-prompt-spark mm-app-prompt-spark-one" />
          <span className="mm-app-prompt-spark mm-app-prompt-spark-two" />
          <span className="mm-app-prompt-device"><Smartphone size={24} /></span>
        </div>

        <p className="mm-app-prompt-eyebrow">MAA MARA MARKET</p>
        <h2 id="mm-app-prompt-title">{installed ? "Continue in the app." : "Shopping looks better in the app."}</h2>
        <p id="mm-app-prompt-description" className="mm-app-prompt-description">
          {installed
            ? "You have the Maa Mara Market app on this device. Open it to pick up where you left off."
            : "Enjoy a smoother way to discover products and keep your marketplace close at hand."}
        </p>

        <div className="mm-app-prompt-platform">
          {isAndroid ? <Smartphone size={20} /> : <Apple size={20} />}
          <div>
            <strong>{isAndroid ? "For Android" : "For iPhone"}</strong>
            <span>{installed ? "App installed" : isAndroid ? "Android app" : "iPhone app"}</span>
          </div>
        </div>

        {installed ? (
          <a className="mm-app-prompt-primary" href={androidOpenInAppUrl(storeUrl)} onClick={dismiss}>
            <Smartphone size={18} />
            Go to app
          </a>
        ) : (
          <a className="mm-app-prompt-primary" href={storeUrl} onClick={dismiss} target="_blank" rel="noreferrer">
            <Download size={18} />
            {isAndroid ? "Download the Android app" : "Download the iPhone app"}
          </a>
        )}

        <button type="button" className="mm-app-prompt-secondary" onClick={dismiss}>
          Continue browsing
        </button>
        <p className="mm-app-prompt-footnote">
          We will remember your choice and keep this reminder dismissed.
        </p>
      </section>
    </div>
  );
};

export default MobileAppDownloadPrompt;
