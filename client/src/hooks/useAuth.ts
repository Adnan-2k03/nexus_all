import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";
import { FirebaseAuthentication } from "@capacitor-firebase/authentication";

export function useAuth() {
  const queryClient = useQueryClient();

  // Standard query to check current user status
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
        console.error("Auth check failed:", error);
        return null;
      }
    },
  });

  // --- REAL AUTH LISTENER (Token Exchange) ---
  useEffect(() => {
    const setupListener = async () => {
      // 1. Clear any old listeners so we don't duplicate events
      await FirebaseAuthentication.removeAllListeners();

      // 2. Listen for the phone's login success
      await FirebaseAuthentication.addListener('authStateChange', async (change) => {
        if (change.user) {
          console.log("📱 Native Login Detected! Exchanging Token with Server...");

          try {
            // 3. Send the Google Token to your NEW Server Route
            // This connects the phone login to the Railway server session
            const res = await fetch(getApiUrl("/api/auth/native-login"), {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include", // <--- CRITICAL: This allows the server to set the cookie
              body: JSON.stringify({ 
                idToken: change.user.idToken,
                user: change.user 
              })
            });

            if (res.ok) {
              console.log("✅ Server Session Created! Refreshing App...");
              // 4. Force React to re-check the user status (now that the cookie is set)
              await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
              await queryClient.refetchQueries({ queryKey: ["/api/auth/user"] });
            } else {
              console.error("❌ Server rejected the token. Check server logs.");
            }
          } catch (err) {
            console.error("Failed to contact server:", err);
          }
        }
      });
    };

    setupListener();
    
    // Cleanup when the component unmounts
    return () => { FirebaseAuthentication.removeAllListeners(); };
  }, [queryClient]);

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}