import { useQuery, useMutation } from "@tanstack/react-query";
import { Coins, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";

interface CreditsDisplayProps {
  showButton?: boolean;
  compact?: boolean;
  onWatchAdClick?: () => void;
}

export function CreditsDisplay({ showButton = false, compact = false, onWatchAdClick }: CreditsDisplayProps) {
  const { toast } = useToast();

  // Fetch user credits
  const { data: credits, isLoading } = useQuery<{ balance: number }>({
    queryKey: ["/api/user/credits"],
    queryFn: async () => {
      const response = await fetch(getApiUrl("/api/user/credits"), {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch credits");
      return await response.json();
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  // Mutation for watching ads
  const watchAdMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/credits/reward-ad", {});
    },
    onSuccess: (data) => {
      toast({
        title: "Success!",
        description: `You earned 5 credits! Total: ${data.balance}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reward credits",
        variant: "destructive",
      });
    },
  });

  const balance = credits?.balance ?? 0;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Coins className="h-4 w-4 text-yellow-500" />
        <span className="text-sm font-semibold">{balance}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {isLoading ? (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-background/50">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span className="text-sm font-semibold">...</span>
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-yellow-500/10 border border-yellow-500/20">
          <Coins className="h-4 w-4 text-yellow-500" />
          <span className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">{balance}</span>
        </div>
      )}
      
      {showButton && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => onWatchAdClick?.()}
          disabled={watchAdMutation.isPending}
          data-testid="button-watch-ad"
        >
          {watchAdMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Coins className="h-4 w-4 mr-2" />
          )}
          Watch Ad
        </Button>
      )}
    </div>
  );
}
