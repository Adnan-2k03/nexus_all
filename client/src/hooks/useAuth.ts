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

        await FirebaseAuthentication.addListener('authStateChange', async (change) => {
          if (change.user) {
            try {
              // Get fresh ID token from Firebase
              const tokenResult = await FirebaseAuthentication.getIdToken();
              const idToken = tokenResult.token;

              if (!idToken) {
                console.error("Failed to get ID token");
                return;
              }

              // Send token to backend for verification
              const res = await fetch(getApiUrl("/api/auth/native-login"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify({ 
                  idToken,
                  user: change.user 
                })
              });

              if (res.ok) {
                // Refetch user data
                await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
                await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
              } else {
                const error = await res.json();
                console.error("Authentication failed:", error);
              }
            } catch (err) {
              console.error("Login error:", err);
            }
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