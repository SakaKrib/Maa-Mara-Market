// All API consumers use the same backend origin as the Axios client.
const baseURL = import.meta.env.VITE_API_URL || import.meta.env.VITE_BASE_URL || (
  typeof window !== "undefined" ? `${window.location.protocol}//${window.location.hostname}:8000` : "http://127.0.0.1:8000"
);

import { getAccessToken, refreshAccessToken } from "./TokenUtils";

export async function fetchWithAuth(url, options = {}) {
  let token = getAccessToken();

  let res = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`
    },
    credentials: "include"
  });

  if (res.status === 401) {
    token = await refreshAccessToken();
    if (!token) throw new Error("Unable to refresh token");

    res = await fetch(url, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      },
      credentials: "include"
    });
  }

  return res;
}
