// src/Services/TokenUtils.js
import { baseUrl } from "../cmponents/Constant/Constant";

export function getAccessToken() {
    const match = document.cookie.match(/(^| )accessToken=([^;]+)/);
    return match ? match[2] : null;
  }
  
  export async function refreshAccessToken() {
    try {
      const res = await fetch(`${baseUrl}/refresh/`, {
        method: "POST",
        credentials: "include"
      });
  
      if (!res.ok) throw new Error("Refresh failed");
  
      const data = await res.json();
      return data.accessToken;
    } catch (err) {
      console.error("Refresh error:", err);
      return null;
    }
  }
  