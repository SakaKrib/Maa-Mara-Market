import React, { useEffect, useState } from "react";
import { Apple, Download, Smartphone, X } from "lucide-react";
import "./mobile-app-download-prompt.css";

const DISMISSED_KEY = "maamara-mobile-app-prompt-dismissed-v1";
const ANDROID_APK_URL =
  "https://github.com/SakaKrib/Maa-Mara-Market/releases/download/mobile-latest/maa-mara-market-android.apk";
const IOS_APP_STORE_URL = ""; // Set this to the public App Store listing after iOS publication.

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

  useEffect(() => {
    if (isNativeApp || typeof window === "undefined" || !isMobileChrome()) return undefined;

    try {
      if (window.localStorage.getItem(DISMISSED_KEY) === "true") return undefined;
    } catch {
      // Continue without persistence if browser storage is blocked.
    }

    if (isInstalledWebApp()) return undefined;

    let active = true;
    const detectAndShow = async () => {
      // Chromium can report related installed apps only when the website/app
      // association is configured on the distribution domain.
      if (typeof navigator.getInstalledRelatedApps === "function") {
        try {
          const relatedApps = await navigator.getInstalledRelatedApps();
          const nativeAppIsInstalled = relatedApps.some((app) =>
            String(app.id || "").toLowerCase() === "com.maamaramarket.app" ||
            String(app.url || "").includes("maamaramarket.com")
          );
          if (nativeAppIsInstalled || !active) return;
        } catch {
          // Unsupported/unassociated browsers cannot reliably expose installed native apps.
        }
      }

      if (!active) return;
      const ua = navigator.userAgent || "";
      setPlatform(/Android/i.test(ua) ? "android" : "ios");
      const timer = window.setTimeout(() => {
        if (active) setVisible(true);
      }, 3500);
      return () => window.clearTimeout(timer);
    };

    let timerCleanup;
    detectAndShow().then((cleanup) => {
      timerCleanup = cleanup;
    });

    return () => {
      active = false;
      timerCleanup?.();
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
  const storeUrl = isAndroid ? ANDROID_APK_URL : IOS_APP_STORE_URL;

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
          <img className="mm-app-prompt-logo-image" src="/maamara-brand-artwork.svg" alt="" />
          <span className="mm-app-prompt-spark mm-app-prompt-spark-one" />
          <span className="mm-app-prompt-spark mm-app-prompt-spark-two" />
          <span className="mm-app-prompt-device"><Smartphone size={24} /></span>
        </div>

        <p className="mm-app-prompt-eyebrow">MAA MARA MARKET</p>
        <h2 id="mm-app-prompt-title">Shopping looks better in the app.</h2>
        <p id="mm-app-prompt-description" className="mm-app-prompt-description">
          Enjoy a smoother way to discover products and keep your marketplace close at hand.
        </p>

        <div className="mm-app-prompt-platform">
          {isAndroid ? <Smartphone size={20} /> : <Apple size={20} />}
          <div>
            <strong>{isAndroid ? "For Android" : "For iPhone"}</strong>
            <span>{isAndroid ? "Android app download" : "iOS app availability"}</span>
          </div>
        </div>

        {storeUrl ? (
          <a
            className="mm-app-prompt-primary"
            href={storeUrl}
            onClick={dismiss}
            target="_blank"
            rel="noreferrer"
          >
            <Download size={18} />
            {isAndroid ? "Download Android APK (Beta)" : "Get it on the App Store"}
          </a>
        ) : (
          <div className="mm-app-prompt-coming-soon" role="status">
            {isAndroid ? "Android beta download is being prepared" : "iPhone app coming soon"}
          </div>
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
