import { useState, useEffect, useRef } from "react";
import { Gift, X, Trophy, TrendingUp, Coins, CheckCircle2, Circle, GripHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { motion, AnimatePresence } from "framer-motion";

export function RewardsOverlay() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  // Start on the right side, near the top
  const [position, setPosition] = useState({ x: typeof window !== 'undefined' ? Math.max(window.innerWidth - 100, 200) : 300, y: 20 });
  const dragStateRef = useRef({ isDragging: false, startX: 0, startY: 0, startPosX: 0, startPosY: 0 });
  
  const { data: user } = useQuery<any>({ 
    queryKey: ["/api/auth/user"]
  });

  const { data: tasks = [] } = useQuery<any[]>({
    queryKey: ["/api/user/tasks"],
    enabled: !!user?.id
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

  // Check if should be hidden (before any conditional rendering)
  const isHiddenByUser = user && user.rewardsOverlayEnabled === false;
  const isHiddenByPage = document.documentElement.getAttribute('data-hide-rewards-overlay') === 'true' || 
                         document.querySelector('[data-hide-rewards-overlay="true"]');
  const shouldHideOverlay = isHiddenByUser || isHiddenByPage;

  const level = user?.level || 1;
  const xp = user?.xp || 0;
  const nextLevelXp = Math.pow(level, 2) * 100;
  const currentLevelXp = Math.pow(level - 1, 2) * 100;
  const progress = ((xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

  // Handle mouse down for dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
    const startX = e.clientX;
    const startY = e.clientY;
    const startPosX = position.x;
    const startPosY = position.y;
    let hasMoved = false;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      
      // Only treat as actual drag if moved more than 5px
      if (!hasMoved && Math.abs(deltaX) <= 5 && Math.abs(deltaY) <= 5) {
        return;
      }
      hasMoved = true;

      let newX = startPosX + deltaX;
      let newY = startPosY + deltaY;

      // Keep on-screen but allow full movement within viewport
      const BUTTON_SIZE = 56;
      const minX = -BUTTON_SIZE + 20; // Allow 20px to show
      const maxX = window.innerWidth - 20;
      const minY = -BUTTON_SIZE + 20;
      const maxY = window.innerHeight - 20;
      
      newX = Math.max(minX, Math.min(newX, maxX));
      newY = Math.max(minY, Math.min(newY, maxY));

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  return (
    <>
      {/* Floating Toggle Button - Draggable */}
      {!shouldHideOverlay && (
        <Button
          onMouseDown={handleMouseDown}
          onClick={() => !dragStateRef.current.isDragging && setIsOpen(true)}
          className="fixed z-[99999] rounded-full w-14 h-14 shadow-lg hover-elevate active-elevate-2 cursor-grab active:cursor-grabbing"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
          }}
          size="icon"
          data-testid="button-rewards-overlay-toggle"
          title="Drag to move, click to open"
        >
          <Trophy className="h-6 w-6" />
          {tasks.some(t => t.status === 'pending') && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-primary border-2 border-background"></span>
            </span>
          )}
          <div className="absolute inset-0 flex items-center justify-center" data-drag-handle>
            <GripHorizontal className="h-4 w-4" />
          </div>
        </Button>
      )}

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-lg"
            >
              <Card className="shadow-2xl border-primary/20">
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Rewards & Level</CardTitle>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} className="h-8 w-8">
                    <X className="h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-6 max-h-[70vh] overflow-y-auto pb-6">
                  {/* Level Progress */}
                  <div className="bg-gradient-to-br from-primary/10 to-transparent p-4 rounded-xl border border-primary/10">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-primary" />
                        <span className="font-bold">Level {level}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{xp} / {nextLevelXp} XP</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                    <p className="text-[10px] text-center text-muted-foreground mt-2 italic">
                      {nextLevelXp - xp} XP to Level {level + 1}
                    </p>
                  </div>

                  {/* Daily Check-in */}
                  <Button 
                    className="w-full justify-between h-12" 
                    variant="outline"
                    onClick={() => claimMutation.mutate()}
                    disabled={claimMutation.isPending}
                  >
                    <div className="flex items-center gap-2">
                      <Gift className="h-5 w-5 text-primary" />
                      <span>Daily Check-in</span>
                    </div>
                    <Badge variant="secondary">+50 Coins</Badge>
                  </Button>

                  {/* Tasks List */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary" />
                      Available Tasks
                    </h3>
                    <div className="grid gap-2">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground italic text-center py-4">No tasks available.</p>
                      ) : (
                        tasks.map((task: any) => (
                          <div 
                            key={task.id} 
                            className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${task.status === 'completed' ? 'bg-muted/50 opacity-60' : 'bg-card hover:bg-muted/20'}`}
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold truncate">{task.title}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{task.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="outline" className="text-[9px] h-4">+{task.rewardCoins} C</Badge>
                                <Badge variant="outline" className="text-[9px] h-4">+{task.rewardXp} XP</Badge>
                              </div>
                            </div>
                            {task.status === 'completed' ? (
                              <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" />
                            ) : (
                              <Button 
                                size="sm" 
                                variant="secondary"
                                onClick={() => completeTaskMutation.mutate(task.taskId)}
                                disabled={completeTaskMutation.isPending}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
