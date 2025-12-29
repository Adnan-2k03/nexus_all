import { Capacitor } from "@capacitor/core";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  if (path.startsWith('http')) {
    return path;
  }

  if (Capacitor.isNativePlatform()) {
    const SERVER_URL = "https://nexusfinalandroid-production.up.railway.app";
    return `${SERVER_URL}${path}`;
  }

  return `${API_BASE_URL}${path}`;
}

export async function apiRequest(
  method: string,
  path: string,
  data?: any,
) {
  const url = getApiUrl(path);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (Capacitor.isNativePlatform()) {
    const token = localStorage.getItem("auth_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(`${res.status}: ${error.message || res.statusText}`);
  }

  return res;
}