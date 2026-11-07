import { Capacitor } from "@capacitor/core";
import { SocialLogin } from "@capgo/capacitor-social-login";
import api, { getVisitorIdentity } from "./Api";

let googleNativeInitialization = null;
let appleNativeInitialization = null;

const loadGoogleIdentityScript = async () => {
  if (window.google?.accounts?.id) return;
  const existing = document.querySelector('script[data-maamara-google-identity]');
  if (existing) {
    await new Promise((resolve, reject) => {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Google sign-in.")), { once: true });
    });
    return;
  }
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.dataset.maamaraGoogleIdentity = "true";
    script.onload = resolve;
    script.onerror = () => reject(new Error("Unable to load Google sign-in."));
    document.head.appendChild(script);
  });
};

const exchangeGoogleCredential = async (credential) => {
  if (!credential) throw new Error("Google did not return an identity token.");
  const { data } = await api.post("/api/google/login/", {
    credential,
    visitorId: getVisitorIdentity(),
  });
  if (!data?.success || !data?.authenticated) {
    throw new Error(data?.error || "Google sign-in could not be completed.");
  }
  return data;
};

export const signInWithGoogle = async () => {
  const webClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || "").trim();
  const iosClientId = String(import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID || "").trim();
  if (!webClientId) throw new Error("Google sign-in is not configured. Set VITE_GOOGLE_CLIENT_ID.");

  if (Capacitor.isNativePlatform()) {
    const platform = Capacitor.getPlatform();
    if (platform === "ios" && !iosClientId) {
      throw new Error("Google sign-in on iOS is not configured. Set VITE_GOOGLE_IOS_CLIENT_ID.");
    }
    if (!googleNativeInitialization) {
      googleNativeInitialization = SocialLogin.initialize({
        google: {
          webClientId,
          ...(platform === "ios" ? { iOSClientId: iosClientId, iOSServerClientId: webClientId } : {}),
          mode: "online",
        },
      }).catch((error) => {
        googleNativeInitialization = null;
        throw error;
      });
    }
    await googleNativeInitialization;
    const response = await SocialLogin.login({
      provider: "google",
      options: { scopes: ["email", "profile"], filterByAuthorizedAccounts: false },
    });
    const credential = response?.result?.idToken || response?.result?.authentication?.idToken;
    return exchangeGoogleCredential(credential);
  }

  await loadGoogleIdentityScript();
  const google = window.google;
  if (!google?.accounts?.id) throw new Error("Google sign-in is unavailable. Please try again.");

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (error, value) => {
      if (settled) return;
      settled = true;
      error ? reject(error) : resolve(value);
    };
    google.accounts.id.initialize({
      client_id: webClientId,
      ux_mode: "popup",
      callback: async (response) => {
        try {
          const result = await exchangeGoogleCredential(response?.credential);
          finish(null, result);
        } catch (error) {
          finish(error);
        }
      },
    });
    google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed?.() || notification.isSkippedMoment?.()) {
        finish(new Error("Google sign-in was not available. Please try again or use email and password."));
      } else if (notification.isDismissedMoment?.() &&
        notification.getDismissedReason?.() !== "credential_returned") {
        finish(new Error("Google sign-in was cancelled."));
      }
    });
  });
};

const createAppleNonce = async () => {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const raw = Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest), (value) => value.toString(16).padStart(2, "0")).join("");
};

export const signInWithApple = async () => {
  const platform = Capacitor.getPlatform();
  if (platform === "android") {
    throw new Error("Apple sign-in is not available on Android.");
  }

  const { data: config } = await api.get("/api/apple/config/");
  if (!config?.enabled || !config?.clientId || !config?.redirectUrl) {
    throw new Error("Apple sign-in is not configured yet. Please use Google or email and password.");
  }

  if (!Capacitor.isNativePlatform()) {
    const base = String(api.defaults.baseURL || "").replace(/\/+$/, "");
    window.location.assign(`${base}/api/apple/start/`);
    return { redirecting: true };
  }

  if (platform !== "ios") {
    throw new Error("Apple sign-in is supported only on the website and iOS.");
  }

  const nonce = await createAppleNonce();
  if (!appleNativeInitialization) {
    appleNativeInitialization = SocialLogin.initialize({
      apple: { clientId: config.bundleId },
    }).catch((error) => {
      appleNativeInitialization = null;
      throw error;
    });
  }
  await appleNativeInitialization;

  const response = await SocialLogin.login({
    provider: "apple",
    options: { scopes: ["email", "name"], nonce },
  });
  const result = response?.result || {};
  const identityToken = result.idToken || result.identityToken || result.identity_token;
  if (!identityToken) throw new Error("Apple did not return a valid identity token.");

  const profile = result.profile || result.user || {};
  const fullName = [
    profile.givenName || profile.firstName || result.givenName,
    profile.familyName || profile.lastName || result.familyName,
  ].filter((part) => typeof part === "string" && part.trim()).join(" ").trim();

  const { data } = await api.post("/api/apple/login/", {
    id_token: identityToken,
    nonce,
    ...(fullName ? { full_name: fullName } : {}),
    visitorId: getVisitorIdentity(),
  });
  if (!data?.success || !data?.authenticated) {
    throw new Error(data?.error || "Apple sign-in could not be completed.");
  }
  return data;
};
