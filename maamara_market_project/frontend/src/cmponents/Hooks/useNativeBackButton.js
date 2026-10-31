import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { notifySnackbar } from "../../../components/ui/app-snackbar";

// Native "App" plugin (@capacitor/app) is installed in the native build step.
const NativeApp = registerPlugin("App");
const EXIT_WINDOW_MS = 2000;
const HOME_PATHS = new Set(["/", "/home"]);

/**
 * Android back button.
 *  - On any inner page: go back one page (or to the home page when this page
 *    was opened directly and there is nothing to go back to). It never exits.
 *  - On the home page: the first press shows a hint, a second press within
 *    2 seconds exits the app.
 */
export default function useNativeBackButton() {
  const navigate = useNavigate();
  const location = useLocation();
  const stateRef = useRef({ pathname: location.pathname, navigate });
  stateRef.current = { pathname: location.pathname, navigate };

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return undefined;
    let lastPress = 0;
    let handle;
    let active = true;

    Promise.resolve(
      NativeApp.addListener("backButton", () => {
        const { pathname, navigate: go } = stateRef.current;
        const onHome = HOME_PATHS.has(pathname.replace(/\/+$/, "") || "/");

        if (!onHome) {
          // React Router stores the position in the history stack as `idx`.
          const idx = window.history.state?.idx;
          if (typeof idx === "number" ? idx > 0 : window.history.length > 1) {
            go(-1);
          } else {
            go("/", { replace: true });
          }
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
