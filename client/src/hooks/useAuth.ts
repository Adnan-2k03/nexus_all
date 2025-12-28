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
    const setupListener = async () => {
      if (!isNative) return;

      try {
        await FirebaseAuthentication.removeAllListeners();

        // Listen for idTokenChange event - this fires when token is ready
        await FirebaseAuthentication.addListener('idTokenChange', async (change) => {
          try {
            if (change.token) {
              console.log("🔐 [Auth] ID Token changed, syncing with backend...");
              const idToken = change.token;

              console.log("✅ [Auth] Got token, sending to backend...");
              const url = getApiUrl("/api/auth/native-login");
              console.log("📍 [Auth] Backend URL:", url);
              console.log("📦 [Auth] Token length:", idToken.length);

              // Send token to backend for verification
              const res = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ 
                  token: idToken
                })
              });

              console.log("📬 [Auth] Backend response status:", res.status);

              if (res.ok) {
                console.log("✅ [Auth] Server accepted token, refetching user...");
                // Refetch user data
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
              } else {
                const errorData = await res.text();
                console.error("❌ [Auth] Server rejected request:", res.status, errorData);
              }
            } else {
              // Token cleared = user signed out
              console.log("🔐 [Auth] Token cleared, user signed out");
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
            }
          } catch (err: any) {
            console.error("❌ [Auth] Network/fetch error:", err.message || err);
            console.error("    Type:", err.constructor.name);
            if (err.stack) console.error("    Stack:", err.stack);
          }
        });
      } catch (err) {
        console.error("Auth listener setup failed:", err);
      }
    };

    setupListener();
    return () => { 
      if (isNative) {
        FirebaseAuthentication.removeAllListeners().catch(() => {});
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