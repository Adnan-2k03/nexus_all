import { Gift, Coins, TrendingUp, CheckCircle2, Circle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface DailyRewardsProps {
  userId?: string;
}

export function DailyRewards({ userId }: DailyRewardsProps) {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"],
    enabled: !!userId
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/user/tasks"],
    enabled: !!userId
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

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card className="md:col-span-1 bg-gradient-to-br from-primary/10 to-transparent border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Level {level}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{xp} XP</span>
              <span>{nextLevelXp} XP</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-[10px] text-center text-muted-foreground italic">
              {nextLevelXp - xp} XP to Level {level + 1}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-lg flex items-center gap-2">
            <Gift className="h-5 w-5 text-primary" />
            Rewards & Tasks
          </CardTitle>
          <Button 
            size="sm" 
            onClick={() => claimMutation.mutate()}
            disabled={claimMutation.isPending}
            className="h-8"
          >
            <Gift className="h-4 w-4 mr-2" />
            Daily Check-in
          </Button>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {tasks.length === 0 ? (
              <p className="text-xs text-muted-foreground italic col-span-2 text-center py-4">No active tasks available.</p>
            ) : (
              tasks.slice(0, 4).map((task: any) => (
                <div 
                  key={task.id} 
                  className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${task.status === 'completed' ? 'bg-muted/50 opacity-60' : 'bg-background hover:bg-muted/20'}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{task.title}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] h-3 px-1">+{task.rewardCoins} C</Badge>
                      <Badge variant="outline" className="text-[8px] h-3 px-1">+{task.rewardXp} XP</Badge>
                    </div>
                  </div>
                  {task.status === 'completed' ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                  ) : (
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-6 w-6 shrink-0"
                      onClick={() => completeTaskMutation.mutate(task.taskId)}
                    >
                      <Circle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}