import { useEffect } from "react";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { notifySnackbar } from "../../../components/ui/app-snackbar";

// Native "App" plugin (@capacitor/app) is installed in the native build step.
const NativeApp = registerPlugin("App");
const EXIT_WINDOW_MS = 2000;

/**
 * Android back button: go back inside the app while there is history;
 * on the first screen, require a second press within 2 seconds to exit.
 */
export default function useNativeBackButton() {
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let lastPress = 0;
    let handle;
    let active = true;

    Promise.resolve(
      NativeApp.addListener("backButton", ({ canGoBack }) => {
        if (canGoBack || window.history.length > 1) {
          window.history.back();
          return;
        }
        const now = Date.now();
        if (now - lastPress <= EXIT_WINDOW_MS) {
          NativeApp.exitApp();
          return;
        }
        lastPress = now;
        notifySnackbar("Press back again to exit", "success");
      })
    )
      .then((h) => {
        if (active) handle = h;
        else h?.remove?.();
      })
      .catch(() => {});

    return () => {
      active = false;
      handle?.remove?.();
    };
  }, []);
}
