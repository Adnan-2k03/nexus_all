import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Coins, Clock, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { getApiUrl } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { AdBanner } from "@/components/AdBanner";

interface AdSession {
  id: string;
  timestamp: number;
  earned: number;
}

export function RewardedAdsPage() {
  const { toast } = useToast();
  const [isWatchingAd, setIsWatchingAd] = useState(false);
  const [adSessions, setAdSessions] = useState<AdSession[]>(() => {
    const stored = localStorage.getItem("adSessions");
    return stored ? JSON.parse(stored) : [];
  });
  const [canWatchAd, setCanWatchAd] = useState(true);
  const [cooldownTime, setCooldownTime] = useState(0);

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
  });

  // Watch ad mutation
  const watchAdMutation = useMutation({
    mutationFn: async () => {
      // Simulate ad watching (3-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      return apiRequest("POST", "/api/credits/reward-ad", {});
    },
    onSuccess: (data) => {
      const newSession: AdSession = {
        id: `ad-${Date.now()}`,
        timestamp: Date.now(),
        earned: 5,
      };
      const updated = [...adSessions, newSession];
      setAdSessions(updated);
      localStorage.setItem("adSessions", JSON.stringify(updated));

      toast({
        title: "Success!",
        description: `You earned 5 credits! Total: ${data.balance}`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });

      // Set cooldown (30 seconds between ads)
      setCanWatchAd(false);
      setCooldownTime(30);
      setIsWatchingAd(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to reward credits",
        variant: "destructive",
      });
      setIsWatchingAd(false);
    },
  });

  // Cooldown timer
  useEffect(() => {
    if (cooldownTime <= 0) return;
    const timer = setTimeout(() => setCooldownTime(cooldownTime - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldownTime]);

  const handleWatchAd = () => {
    setIsWatchingAd(true);
    watchAdMutation.mutate();
  };

  const totalEarned = adSessions.reduce((sum, session) => sum + session.earned, 0);
  const todaySessions = adSessions.filter(
    session => new Date(session.timestamp).toDateString() === new Date().toDateString()
  );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Banner Ad */}
      <AdBanner visible={true} />

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">Earn Credits</h1>
        <p className="text-muted-foreground">Watch ads to earn credits and boost your gaming profile</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Current Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Coins className="h-6 w-6 text-yellow-500" />
              <span className="text-3xl font-bold">{isLoading ? "..." : credits?.balance ?? 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Ads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-500" />
              <span className="text-3xl font-bold">{todaySessions.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Earned</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <span className="text-3xl font-bold">{totalEarned}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ad Watching Section */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Watch an Ad
          </CardTitle>
          <CardDescription>
            Watch a short advertisement to earn 5 credits instantly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isWatchingAd ? (
            <div className="p-8 bg-background/50 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Playing Advertisement...</p>
                <p className="text-sm text-muted-foreground">Please wait while the ad plays</p>
              </div>
            </div>
          ) : (
            <div className="p-8 bg-background/50 rounded-lg border border-dashed flex flex-col items-center justify-center gap-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Ready to earn?</p>
                <p className="font-semibold text-foreground mb-4">Click below to watch an ad</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleWatchAd}
            disabled={!canWatchAd || isWatchingAd || watchAdMutation.isPending}
            size="lg"
            className="w-full"
            data-testid="button-watch-rewarded-ad"
          >
            {isWatchingAd || watchAdMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Watching Ad...
              </>
            ) : !canWatchAd ? (
              <>
                <Clock className="h-4 w-4 mr-2" />
                Wait {cooldownTime}s before next ad
              </>
            ) : (
              <>
                <Coins className="h-4 w-4 mr-2" />
                Watch Ad & Earn 5 Credits
              </>
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            You can watch one ad every 30 seconds. No limit on daily ads!
          </p>
        </CardContent>
      </Card>

      {/* How to Use Credits */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">How to Use Your Credits</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 items-start">
            <Badge className="mt-1">5</Badge>
            <div>
              <p className="font-medium">Post a Match</p>
              <p className="text-sm text-muted-foreground">Post your LFG/LFO match request</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="mt-1">50</Badge>
            <div>
              <p className="font-medium">Boost Portfolio</p>
              <p className="text-sm text-muted-foreground">Boost a match to top visibility for 24 hours</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="mt-1">500</Badge>
            <div>
              <p className="font-medium">Pro Subscription</p>
              <p className="text-sm text-muted-foreground">Unlock 10 connection requests per day</p>
            </div>
          </div>
          <div className="flex gap-3 items-start">
            <Badge className="mt-1">1500</Badge>
            <div>
              <p className="font-medium">Gold Subscription</p>
              <p className="text-sm text-muted-foreground">Unlock 50 connection requests per day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Ad History */}
      {adSessions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Ad History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {[...adSessions].reverse().map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 bg-background/50 rounded border">
                  <div>
                    <p className="font-medium">Ad Watched</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(session.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                    +{session.earned}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
