import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export function RewardsOverlayToggle({ userId }: { userId?: string }) {
  const { toast } = useToast();
  const { data: user } = useQuery<any>({
    queryKey: ["/api/auth/user"],
    enabled: !!userId,
  });

  const mutation = useMutation({
    mutationFn: async (enabled: boolean) => {
      const res = await apiRequest("PATCH", "/api/user/profile", {
        rewardsOverlayEnabled: enabled,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Settings updated",
        description: "Rewards overlay preference saved.",
      });
    },
  });

  return (
    <div className="flex items-center justify-between space-x-2">
      <Label htmlFor="rewards-overlay" className="flex flex-col space-y-1">
        <span>Enable Rewards Overlay</span>
        <span className="font-normal text-xs text-muted-foreground">
          Show floating trophy button on all pages
        </span>
      </Label>
      <Switch
        id="rewards-overlay"
        checked={user?.rewardsOverlayEnabled !== false}
        onCheckedChange={(checked) => mutation.mutate(checked)}
        disabled={mutation.isPending}
      />
    </div>
  );
}
