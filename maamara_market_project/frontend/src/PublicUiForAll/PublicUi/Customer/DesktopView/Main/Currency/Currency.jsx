import { useEffect, useState } from "react";
import { getWebSocketUrl } from "../../../../../../Services/Api";

const getCurrencyWebSocketUrl = () => getWebSocketUrl("/ws/currency/");

// Emergency display-only rates relative to KES. These are approximate and
// should be replaced by live rates whenever the currency WebSocket connects.
export const FALLBACK_RATES = {
  KES: 1,
  USD: 1 / 140,
  EUR: 1 / 155,
  GBP: 1 / 180,
};

const getSameOriginWebSocketUrl = () => {
  if (typeof window === "undefined") return "";
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws/currency/`;
};

const withFallbackRates = (rates) => ({
  ...FALLBACK_RATES,
  ...(rates && typeof rates === "object" ? rates : {}),
  KES: 1,
});

export const useCurrencyRates = () => {
  const [rates, setRates] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const primaryUrl = getCurrencyWebSocketUrl();
    const sameOriginUrl = getSameOriginWebSocketUrl();

    if (!primaryUrl) {
      setRates(FALLBACK_RATES);
      setLoading(false);
      return undefined;
    }

    let active = true;
    let socket = null;
    let fallbackAttempted = false;

    const useFallbackRates = () => {
      if (!active) return;
      setRates(FALLBACK_RATES);
      setLoading(false);
    };

    const connect = (url, isFallback = false) => {
      if (!active) return;

      try {
        socket = new WebSocket(url);

        socket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data?.type === "currency_rates" && active) {
              setRates(withFallbackRates(data.rates));
              setLoading(false);
            }
          } catch {
            // Ignore malformed messages and keep the last valid rate snapshot.
          }
        };

        socket.onerror = () => {
          if (!active) return;

          // If the configured API host cannot accept WebSockets, try the
          // current site origin once (Vite's /ws proxy in local development).
          if (!isFallback && sameOriginUrl && sameOriginUrl !== primaryUrl && !fallbackAttempted) {
            fallbackAttempted = true;
            socket?.close();
            connect(sameOriginUrl, true);
            return;
          }

          // Keep currency selection usable when live rates are unavailable.
          useFallbackRates();
        };
      } catch {
        if (!isFallback && sameOriginUrl && sameOriginUrl !== primaryUrl && !fallbackAttempted) {
          fallbackAttempted = true;
          connect(sameOriginUrl, true);
          return;
        }
        useFallbackRates();
      }
    };

    connect(primaryUrl);

    return () => {
      active = false;
      socket?.close();
    };
  }, []);

  return { rates, loading };
};
