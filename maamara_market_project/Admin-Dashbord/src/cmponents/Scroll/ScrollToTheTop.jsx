import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function ScrollTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const scrollToTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }

      if (document.body) {
        document.body.scrollTop = 0;
      }

      const scrollingElement = document.scrollingElement;
      if (scrollingElement) {
        scrollingElement.scrollTop = 0;
      }
    };

    const previousRestoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";

    scrollToTop();
    const frame = window.requestAnimationFrame(scrollToTop);

    return () => {
      window.cancelAnimationFrame(frame);
      window.history.scrollRestoration = previousRestoration;
    };
  }, [pathname]);

  return null;
}

export default ScrollTop;
