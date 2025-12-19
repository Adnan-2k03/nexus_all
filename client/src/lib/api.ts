import { Capacitor } from "@capacitor/core";

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export function getApiUrl(path: string): string {
  // If the path is already a full URL (starts with http), leave it alone
  if (path.startsWith('http')) {
    return path;
  }

  // --- THE FIX ---
  // If we are running on the Android App, FORCE the real server URL.
  if (Capacitor.isNativePlatform()) {
    // Note: No slash at the end of this URL!
    const SERVER_URL = "https://nexusfinalandroid-production.up.railway.app";
    return `${SERVER_URL}${path}`;
  }
  // ----------------

  return `${API_BASE_URL}${path}`;
}