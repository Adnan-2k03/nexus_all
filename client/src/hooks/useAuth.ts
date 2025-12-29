import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";
import { Capacitor } from "@capacitor/core";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

export function useAuth() {
  const queryClient = useQueryClient();
  const isNative = Capacitor.isNativePlatform();

  const { data: user, isLoading, isFetching } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      try {
        const url = getApiUrl("/api/auth/user");
        const token = localStorage.getItem("auth_token");
        console.log("🔍 [useAuth Query] Checking token - exists:", !!token, "length:", token?.length || 0);
        
        const headers: Record<string, string> = {
          "Accept": "application/json"
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
          console.log("✅ [useAuth Query] Added Authorization header");
          console.log("   Header value starts with:", headers["Authorization"].substring(0, 20));
        } else if (Capacitor.isNativePlatform()) {
          console.log("⚠️ [useAuth Query] Native platform but no token found");
          return null;
        }

        console.log("📤 [useAuth Query] Sending GET /api/auth/user with headers:", Object.keys(headers));
        const response = await fetch(url, {
          headers,
          credentials: "include",
        });
        console.log("📥 [useAuth Query] Response status:", response.status);
        
        if (response.status === 401 || !response.ok) {
          // If we get 401 on native, clear the potentially stale token
          if (Capacitor.isNativePlatform()) {
            localStorage.removeItem("auth_token");
          }
          return null;
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("❌ [useAuth Query] Error:", error);
        return null;
      }
    },
  });

  // --- AUTH STATE LISTENER ---
  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;
    let listener: any = null;

    const syncToken = async (token: string | null | undefined) => {
      if (!isMounted || !token) {
        console.log("🔐 [Auth] Skipping sync: token is empty or component unmounted");
        return;
      }
      try {
        console.log("🔐 [Auth] Syncing token with backend (length:", token.length, ")");
        const url = getApiUrl("/api/auth/native-login");
        
        // Ensure we're sending a clean string token
        const tokenString = String(token).trim();
        
        const res = await fetch(url, {
          method: "POST",
          headers: { 
            "Content-Type": "application/json",
            "Accept": "application/json"
          },
          body: JSON.stringify({ token: tokenString }),
          credentials: "include"
        });

        console.log("🔐 [Auth] Fetch response status:", res.status);

        if (res.ok && isMounted) {
          const data = await res.json();
          console.log("📥 [syncToken] Response data keys:", Object.keys(data));
          if (data.token) {
            console.log("✅ [syncToken] JWT token found in response, storing...");
            localStorage.setItem("auth_token", data.token);
            const stored = localStorage.getItem("auth_token");
            console.log("✅ [syncToken] Verified token stored - length:", stored?.length || 0);
          } else {
            console.warn("⚠️ [syncToken] No token field in response data");
          }
          console.log("✅ [Auth] Server accepted token, about to refetch user...");
          // Log before invalidating
          const tokenBeforeInvalidate = localStorage.getItem("auth_token");
          console.log("🔍 [Auth] Token in storage before refetch:", tokenBeforeInvalidate?.substring(0, 20) + "...");
          // Add delay to ensure token is committed before query runs
          await new Promise(resolve => setTimeout(resolve, 200));
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          console.log("✅ [Auth] User refetch queued");
        } else {
          const errorText = await res.text();
          console.error("❌ [Auth] Server sync failed:", res.status, errorText);
        }
      } catch (err) {
        console.error("❌ [Auth] Sync error:", err);
      }
    };

    const setupListener = async () => {
      try {
        console.log("🔐 [Auth] Initializing Firebase Auth listeners...");
        
        // Register listener
        listener = await FirebaseAuthentication.addListener('idTokenChange', (change) => {
          console.log("🔐 [Auth] idTokenChange event triggered", {
            hasToken: !!change.token,
            tokenType: typeof change.token
          });
          
          if (change.token) {
            syncToken(change.token);
          } else {
            console.log("🔐 [Auth] No token in event, clearing user");
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }
        });
        
        console.log("✅ [Auth] Native listener attached");

        // Immediate check
        const currentToken = await FirebaseAuthentication.getIdToken();
        console.log("🔐 [Auth] Initial check result:", {
          hasToken: !!currentToken.token,
          tokenType: typeof currentToken.token
        });
        
        if (currentToken.token) {
          syncToken(currentToken.token);
        }
      } catch (err) {
        console.error("❌ [Auth] Listener setup failed:", err);
      }
    };

    setupListener();

    return () => {
      isMounted = false;
      if (listener) {
        listener.remove().catch(() => {});
      }
    };
  }, [queryClient, isNative]);

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}