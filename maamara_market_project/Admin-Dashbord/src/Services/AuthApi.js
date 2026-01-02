// src/Services/AuthApi.js

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
