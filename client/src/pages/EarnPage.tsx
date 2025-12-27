import { Gift, Coins, TrendingUp, CheckCircle2, Circle, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useLayout } from "@/contexts/LayoutContext";
import { RewardedAdsPage } from "./RewardedAdsPage";

export function EarnPage({ currentUserId }: { currentUserId?: string }) {
  const { toast } = useToast();
  const { getContainerClass } = useLayout();
  
  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"],
    enabled: !!currentUserId
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/user/tasks"],
    enabled: !!currentUserId
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/user/claim-reward");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        toast({ title: "Reward Claimed!", description: data.message });
      } else {
        toast({ title: "Already Claimed", description: data.message, variant: "destructive" });
      }
    }
  });

  const completeTaskMutation = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await apiRequest("POST", `/api/tasks/${taskId}/complete`);
      return res.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/tasks"] });
        toast({ title: "Task Completed!", description: data.message });
      }
    }
  });

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  const pendingTasks = tasks.filter((t: any) => t.status !== 'completed');
  const completedTasks = tasks.filter((t: any) => t.status === 'completed');

  return (
    <div className={`${getContainerClass()} mx-auto space-y-6`}>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Coins className="h-8 w-8" />
          Earn Credits & XP
        </h1>
        <p className="text-muted-foreground mt-1">Complete tasks, watch ads, and claim daily bonuses to earn rewards</p>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="tasks" className="w-full">
        <TabsList className="grid w-full grid-cols-2" data-testid="tabs-earn-options">
          <TabsTrigger value="tasks" data-testid="tab-tasks">
            <Trophy className="h-4 w-4 mr-2" />
            Tasks & Check-in
          </TabsTrigger>
          <TabsTrigger value="ads" data-testid="tab-watch-ads">
            <Coins className="h-4 w-4 mr-2" />
            Watch Ads
          </TabsTrigger>
        </TabsList>

        {/* Tasks & Check-in Tab */}
        <TabsContent value="tasks" className="space-y-6">
          {/* Level Progress */}
          <Card className="bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Your Level
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-2xl font-bold">Level {level}</span>
                  <span className="text-muted-foreground">{xp} / {nextLevelXp} XP</span>
                </div>
                <Progress value={progress} className="h-3" />
                <p className="text-sm text-center text-muted-foreground">
                  {Math.max(0, nextLevelXp - xp)} XP to Level {level + 1}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Daily Check-in */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Gift className="h-5 w-5 text-primary" />
                Daily Check-in Bonus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-muted-foreground">Claim your daily bonus reward</p>
                  <Badge className="mt-2">+50 Coins, +10 XP</Badge>
                </div>
                <Button 
                  onClick={() => claimMutation.mutate()}
                  disabled={claimMutation.isPending}
                  size="lg"
                >
                  <Gift className="h-4 w-4 mr-2" />
                  {claimMutation.isPending ? "Claiming..." : "Claim Reward"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Available Tasks ({pendingTasks.length})
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              {pendingTasks.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pending tasks available.</p>
                  <p className="text-xs text-muted-foreground mt-2">Tasks reset daily - check back tomorrow!</p>
                </div>
              ) : (
                <div className="grid gap-3">
                  {pendingTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="p-4 rounded-lg border bg-card hover:bg-muted/20 flex items-center justify-between gap-4 transition-colors"
                      data-testid={`task-${task.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{task.title}</p>
                        <p className="text-xs text-muted-foreground mt-1">{task.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Coins className="h-3 w-3 mr-1" />
                            +{task.rewardCoins}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <TrendingUp className="h-3 w-3 mr-1" />
                            +{task.rewardXp}
                          </Badge>
                          {task.type === 'daily' && (
                            <Badge variant="secondary" className="text-xs">Daily</Badge>
                          )}
                        </div>
                      </div>
                      <Button 
                        size="sm"
                        onClick={() => completeTaskMutation.mutate(task.taskId)}
                        disabled={completeTaskMutation.isPending}
                      >
                        <Circle className="h-4 w-4 mr-2" />
                        Complete
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Completed Tasks ({completedTasks.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-2">
                  {completedTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="p-3 rounded-lg border bg-muted/50 opacity-60 flex items-center justify-between gap-3"
                      data-testid={`completed-task-${task.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm line-through">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">+{task.rewardCoins} C</Badge>
                          <Badge variant="outline" className="text-xs">+{task.rewardXp} XP</Badge>
                        </div>
                      </div>
                      <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Watch Ads Tab */}
        <TabsContent value="ads" className="mt-6">
          <RewardedAdsPage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
