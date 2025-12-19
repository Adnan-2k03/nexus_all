import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

export function useAuth() {
  const queryClient = useQueryClient();

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

  // --- REAL AUTH LISTENER (Fixed Token Fetching) ---
  useEffect(() => {
    const setupListener = async () => {
      await FirebaseAuthentication.removeAllListeners();

      await FirebaseAuthentication.addListener('authStateChange', async (change) => {
        if (change.user) {
          console.log("📱 Native Login Detected! Fetching fresh token...");

          try {
            // 1. GET THE TOKEN EXPLICITLY (The Fix)
            // We don't trust change.user.idToken anymore. We ask for a fresh one.
            const tokenResult = await FirebaseAuthentication.getIdToken();
            const idToken = tokenResult.token;

            if (!idToken) {
              console.error("❌ No ID Token found even after fetching!");
              return;
            }

            console.log("✅ Got Token. sending to server...");

            // 2. Send the fresh token to Railway
            const res = await fetch(getApiUrl("/api/auth/native-login"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include", // CRITICAL: This allows the server to set the cookie
              body: JSON.stringify({ 
                idToken: idToken, 
                user: change.user 
              })
            });

            if (res.ok) {
              console.log("✅ Server Session Created! Entering App...");
              // 3. Force React to re-check the user status
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
            } else {
              const errorText = await res.text();
              console.error("❌ Server rejected the token:", errorText);
            }
          } catch (err) {
            console.error("Failed to perform native login:", err);
          }
        }
      });
    };

    setupListener();
    return () => { FirebaseAuthentication.removeAllListeners(); };
  }, [queryClient]);

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}