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
  const [purchasingTier, setPurchasingTier] = useState<string | null>(null);

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
  const watchAdMutation = useMutation<{ balance: number }, Error>({
    mutationFn: async () => {
      // Simulate ad watching (3-5 seconds)
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));
      const response = await fetch(getApiUrl("/api/credits/reward-ad"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) throw new Error("Failed to reward credits");
      return await response.json();
    },
    onSuccess: (data: { balance: number }) => {
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

  const purchaseSubscription = async (tier: string) => {
    setPurchasingTier(tier);
    try {
      const response = await fetch(getApiUrl(`/api/subscription/purchase/${tier}`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({}),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to purchase subscription");
      }

      const data = await response.json();
      toast({
        title: "Success!",
        description: data.message,
      });
      
      queryClient.invalidateQueries({ queryKey: ["/api/user/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/subscription/status"] });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to purchase subscription",
        variant: "destructive",
      });
    } finally {
      setPurchasingTier(null);
    }
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

      {/* Subscription Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Pro Subscription */}
        <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-blue-500" />
              Pro Subscription
            </CardTitle>
            <CardDescription>2 days • Valid for 48 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-3 rounded border">
              <p className="font-bold text-2xl text-blue-600 dark:text-blue-400">150 Credits</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm">Benefits:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ 15 connection requests per day</li>
                <li>✓ Priority in search results</li>
                <li>✓ No ads while browsing</li>
              </ul>
            </div>
            <Button 
              onClick={() => purchaseSubscription('pro')}
              disabled={purchasingTier === 'pro' || (credits?.balance || 0) < 150}
              className="w-full bg-blue-600 hover:bg-blue-700"
              data-testid="button-buy-pro-subscription"
            >
              {purchasingTier === 'pro' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                `Buy Pro - 150 Credits`
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Gold Subscription */}
        <Card className="border-yellow-500/30 bg-yellow-50 dark:bg-yellow-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-600" />
              Gold Subscription
            </CardTitle>
            <CardDescription>2 days • Valid for 48 hours</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white dark:bg-slate-900 p-3 rounded border">
              <p className="font-bold text-2xl text-yellow-600 dark:text-yellow-400">300 Credits</p>
            </div>
            <div className="space-y-2">
              <p className="font-medium text-sm">Benefits:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>✓ 30 connection requests per day</li>
                <li>✓ Top priority in results</li>
                <li>✓ Premium badge on profile</li>
                <li>✓ No ads while browsing</li>
              </ul>
            </div>
            <Button 
              onClick={() => purchaseSubscription('gold')}
              disabled={purchasingTier === 'gold' || (credits?.balance || 0) < 300}
              className="w-full bg-yellow-600 hover:bg-yellow-700"
              data-testid="button-buy-gold-subscription"
            >
              {purchasingTier === 'gold' ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Purchasing...
                </>
              ) : (
                `Buy Gold - 300 Credits`
              )}
            </Button>
          </CardContent>
        </Card>
      </div>

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
