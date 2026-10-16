import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "../../Services/Api";

let currentPushToken = "";
let currentVisitorId = "";
let setupPromise = null;

const resolvePushTarget = (rawUrl) => {
  if (!rawUrl || typeof window === "undefined") return null;
  try {
    const target = new URL(rawUrl, window.location.origin);
    return target.origin === window.location.origin ? target : null;
  } catch {
    return null;
  }
};

async function savePushToken(token = currentPushToken) {
  if (!token) return false;
  const platform = Capacitor.getPlatform();
  if (platform !== "android" && platform !== "ios") return false;

  try {
    await api.post(
      "/api/push/devices/",
      {
        token,
        platform,
        ...(currentVisitorId ? { visitor_id: currentVisitorId } : {}),
      },
      { withCredentials: true }
    );
    return true;
  } catch (error) {
    // Keep the token in memory so a subsequent app/auth lifecycle can retry.
    console.warn(
      "Push token registration was not saved:",
      error?.response?.status || error?.message
    );
    return false;
  }
}

export async function registerCurrentNativePushDevice(visitorId = "") {
  currentVisitorId = visitorId || "";
  return savePushToken();
}

export async function setupNativePushNotifications(visitorId = "") {
  currentVisitorId = visitorId || "";
  if (!Capacitor.isNativePlatform()) return () => {};
  if (import.meta.env.VITE_NATIVE_PUSH_ENABLED === "false") return () => {};
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const handles = [];
    try {
      // Create a high-importance Android channel before asking FCM to deliver.
      // Android controls the final notification appearance and user sound choice.
      if (Capacitor.getPlatform() === "android") {
        try {
          await PushNotifications.createChannel({
            id: "maamara_updates",
            name: "Maa Mara Market notifications",
            description: "Order, message, wishlist and marketplace updates",
            importance: 5,
            visibility: 1,
            sound: "default",
            vibration: true,
            lights: true,
          });
        } catch (error) {
          console.warn("Could not create Android push channel:", error?.message || error);
        }
      }

      handles.push(await PushNotifications.addListener("registration", async (token) => {
        currentPushToken = token?.value || "";
        await savePushToken(currentPushToken);
      }));

      handles.push(await PushNotifications.addListener("registrationError", (error) => {
        console.warn("Native push registration failed:", error);
      }));

      handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const target = resolvePushTarget(event?.notification?.data?.url);
        if (target) window.location.assign(target.toString());
      }));

      // Keep foreground notification events observable to the app without
      // forcing a custom background/text colour over the operating-system theme.
      handles.push(await PushNotifications.addListener("pushNotificationReceived", (notification) => {
        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("maamara:push-received", {
            detail: notification,
          }));
        }
      }));

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== "granted") {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === "granted") {
        await PushNotifications.register();
        // If the native plugin already has a token, rebind it to the current
        // visitor/account session. This also retries a previous failed POST.
        if (currentPushToken) await savePushToken(currentPushToken);
      } else {
        console.info("Native push notifications were not permitted by the user.");
      }
    } catch (error) {
      console.warn("Native push notifications are not configured on this build yet:", error);
    }

    return async () => {
      await Promise.all(handles.map((handle) => handle.remove().catch(() => {})));
      setupPromise = null;
    };
  })();

  return setupPromise;
}

export async function unregisterNativePushDevice() {
  const pendingSetup = setupPromise;
  if (pendingSetup) {
    try {
      const cleanup = await pendingSetup;
      await cleanup?.();
    } catch {
      setupPromise = null;
    }
  }

  const token = currentPushToken;
  if (!token) return;
  try {
    await api.delete("/api/push/devices/", {
      data: { token },
      withCredentials: true,
    });
  } catch (error) {
    console.warn(
      "Could not unregister this device's push token:",
      error?.response?.status || error?.message
    );
  } finally {
    currentPushToken = "";
  }
}
