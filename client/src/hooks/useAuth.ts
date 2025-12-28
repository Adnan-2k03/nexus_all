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

    const setupListener = async () => {
      try {
        // Set up listener immediately
        const listener = await FirebaseAuthentication.addListener('idTokenChange', async (change) => {
          if (!isMounted) return;
          
          try {
            console.log("🔐 [Auth] idTokenChange event fired, change:", change);
            
            if (change.token) {
              console.log("🔐 [Auth] ID Token changed, syncing with backend...");
              const idToken = change.token;

              console.log("✅ [Auth] Got token, sending to backend...");
              const url = getApiUrl("/api/auth/native-login");
              
              // Send token to backend for verification
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ token: idToken })
              });

              if (res.ok && isMounted) {
                console.log("✅ [Auth] Server accepted token, refetching user...");
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              } else if (!res.ok) {
                const errorData = await res.text();
                console.error("❌ [Auth] Server rejected request:", res.status, errorData);
              }
            } else {
              console.log("🔐 [Auth] Token cleared, user signed out");
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            }
          } catch (err: any) {
            console.error("❌ [Auth] Listener error:", err.message || err);
          }
        });

        // Trigger an initial check to catch any missed state changes
        const currentToken = await FirebaseAuthentication.getIdToken();
        if (currentToken.token && isMounted) {
          console.log("🔐 [Auth] Initial token check found active session");
          const url = getApiUrl("/api/auth/native-login");
          await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ token: currentToken.token })
          });
          await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }

        return listener;
      } catch (err) {
        console.error("❌ [Auth] Failed to setup listener:", err);
      }
    };

    const listenerPromise = setupListener();

    return () => {
      isMounted = false;
      listenerPromise.then(listener => {
        if (listener) listener.remove();
      }).catch(() => {});
    };
  }, [queryClient, isNative]);

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}