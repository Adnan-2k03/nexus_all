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
        const response = await fetch(getApiUrl("/api/auth/user"), {
          credentials: "include",
        });
        
        if (response.status === 401 || !response.ok) {
          return null;
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        }
        return null;
      } catch (error) {
        return null;
      }
    },
  });

  // --- AUTH STATE LISTENER ---
  useEffect(() => {
    if (!isNative) return;

    let isMounted = true;
    let listener: any = null;

    const syncToken = async (token: string) => {
      if (!isMounted) return;
      try {
        console.log("🔐 [Auth] Syncing token with backend...");
        const url = getApiUrl("/api/auth/native-login");
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ token })
        });

        if (res.ok && isMounted) {
          console.log("✅ [Auth] Server accepted token, refetching user...");
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (err) {
        console.error("❌ [Auth] Sync error:", err);
      }
    };

    const setupListener = async () => {
      try {
        // Register listener
        listener = await FirebaseAuthentication.addListener('idTokenChange', (change) => {
          console.log("🔐 [Auth] idTokenChange event fired:", !!change.token);
          if (change.token) {
            syncToken(change.token);
          } else {
            queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
          }
        });

        // Immediate check to catch early events
        const currentToken = await FirebaseAuthentication.getIdToken();
        if (currentToken.token && isMounted) {
          console.log("🔐 [Auth] Initial check found active session");
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