import { Capacitor } from "@capacitor/core";
import { PushNotifications } from "@capacitor/push-notifications";
import api from "../../Services/Api";

let currentPushToken = "";
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

export async function setupNativePushNotifications() {
  if (!Capacitor.isNativePlatform()) return () => {};
  if (import.meta.env.VITE_NATIVE_PUSH_ENABLED === "false") return () => {};
  if (setupPromise) return setupPromise;

  setupPromise = (async () => {
    const handles = [];
    try {
      handles.push(await PushNotifications.addListener("registration", async (token) => {
        currentPushToken = token?.value || "";
        if (!currentPushToken) return;
        const platform = Capacitor.getPlatform();
        if (platform !== "android" && platform !== "ios") return;
        try {
          await api.post("/api/push/devices/", {
            token: currentPushToken,
            platform,
          }, { withCredentials: true });
        } catch (error) {
          // The token event can occur before authentication is fully restored.
          // A later app/login setup retries registration.
          console.warn("Push token registration was not saved:", error?.response?.status || error?.message);
        }
      }));

      handles.push(await PushNotifications.addListener("registrationError", (error) => {
        console.warn("Native push registration failed:", error);
      }));

      handles.push(await PushNotifications.addListener("pushNotificationActionPerformed", (event) => {
        const target = resolvePushTarget(event?.notification?.data?.url);
        if (target) window.location.assign(target.toString());
      }));

      let permission = await PushNotifications.checkPermissions();
      if (permission.receive !== "granted") {
        permission = await PushNotifications.requestPermissions();
      }
      if (permission.receive === "granted") {
        await PushNotifications.register();
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
  if (!currentPushToken) return;
  const token = currentPushToken;
  try {
    await api.delete("/api/push/devices/", {
      data: { token },
      withCredentials: true,
    });
  } catch (error) {
    console.warn("Could not unregister this device's push token:", error?.response?.status || error?.message);
  } finally {
    currentPushToken = "";
  }
}
