import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Gift, Coins, Loader2 } from "lucide-react";

export function DailyRewards({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const [timeLeft, setTimeLeft] = useState<string>("");

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
    enabled: !!userId,
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(getApiUrl("/api/user/claim-reward"), {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to claim reward");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: data.success ? "Success" : "Reward Status",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    if (!user?.dailyRewardLastClaimed) return;

    const interval = setInterval(() => {
      const lastClaimed = new Date(user.dailyRewardLastClaimed).getTime();
      const nextClaim = lastClaimed + 24 * 60 * 60 * 1000;
      const now = new Date().getTime();
      const diff = nextClaim - now;

      if (diff <= 0) {
        setTimeLeft("");
        clearInterval(interval);
      } else {
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user?.dailyRewardLastClaimed]);

  if (isLoading) return <Loader2 className="animate-spin" />;

  const canClaim = !user?.dailyRewardLastClaimed || timeLeft === "";

  return (
    <Card className="p-4 bg-gradient-to-br from-indigo-900/50 to-purple-900/50 border-indigo-500/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/20 rounded-lg">
            <Gift className="h-6 w-6 text-indigo-400" />
          </div>
          <div>
            <h3 className="font-bold">Daily Reward</h3>
            <p className="text-sm text-muted-foreground">Claim 50 coins every 24 hours</p>
          </div>
        </div>
        
        <div className="text-right">
          <Button 
            disabled={!canClaim || claimMutation.isPending}
            onClick={() => claimMutation.mutate()}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {claimMutation.isPending ? "Claiming..." : canClaim ? "Claim Reward" : timeLeft}
          </Button>
          <div className="flex items-center justify-end gap-1 mt-2">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-bold">{user?.coins || 0}</span>
          </div>
        </div>
      </div>
    </Card>
  );
}
