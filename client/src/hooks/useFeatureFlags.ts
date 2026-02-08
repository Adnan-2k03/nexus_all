import { useQuery } from "@tanstack/react-query";
import { getApiUrl } from "@/lib/api";

export interface FeatureFlag {
  id: string;
  featureName: string;
  isEnabled: boolean;
  filters: Record<string, boolean>;
  description: string | null;
  updatedAt: string;
  updatedBy: string | null;
}

export function useFeatureFlags() {
  const { data: flags = [] } = useQuery<FeatureFlag[]>({
    queryKey: ['/api/feature-flags'],
    queryFn: async () => {
      try {
        const response = await fetch(getApiUrl("/api/feature-flags"), {
          credentials: "include",
        });
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        console.error("Failed to fetch feature flags:", error);
      }
      return [];
    },
    staleTime: 1000 * 30, // 30 seconds for faster updates to lock status
    retry: 1,
  });

  const isFeatureVisible = (featureName: string): boolean => {
    if (!Array.isArray(flags)) return true;
    const flag = flags.find((f) => f.featureName === featureName);
    if (!flag) return true; // Show by default if not configured
    return flag.isEnabled && !flag.filters?.hide;
  };

  const isFeatureEnabled = (featureName: string): boolean => {
    if (!Array.isArray(flags)) return true;
    const flag = flags.find((f) => f.featureName === featureName);
    if (!flag) return true;
    return flag.isEnabled;
  };

  const isFeatureLocked = (featureName: string): boolean => {
    if (!Array.isArray(flags)) return true;
    const flag = flags.find((f) => f.featureName === featureName);
    if (!flag) return false;
    return flag.filters?.lock === true;
  };

  return {
    flags,
    isFeatureVisible,
    isFeatureEnabled,
    isFeatureLocked,
  };
}
