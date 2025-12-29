import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";
import { getApiUrl } from "@/lib/api";
import { AuthStorage } from "@/lib/storage";

export function useAuth() {
  const { data: user, isLoading, isFetching } = useQuery<User | null>({
    queryKey: ["/api/auth/user"],
    retry: false,
    queryFn: async () => {
      try {
        const url = getApiUrl("/api/auth/user");
        const token = await AuthStorage.getToken();
        
        const headers: Record<string, string> = {
          "Accept": "application/json"
        };
        
        if (token) {
          headers["Authorization"] = `Bearer ${token}`;
        }

        const response = await fetch(url, {
          headers,
          credentials: "include",
        });
        
        if (response.status === 401 || !response.ok) {
          await AuthStorage.removeToken();
          return null;
        }
        
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.includes("application/json")) {
          return await response.json();
        }
        return null;
      } catch (error) {
        console.error("Auth check error:", error);
        return null;
      }
    },
  });

  return {
    user,
    isLoading,
    isFetching,
    isAuthenticated: !!user,
  };
}