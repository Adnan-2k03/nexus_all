import { useState } from 'react';
import { showRewardedAd, isAdMobAvailable } from '@/lib/admob';
import { Button } from '@/components/ui/button';
import { Gamepad2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface RewardedAdButtonProps {
  onReward: () => void;
  label?: string;
  disabled?: boolean;
}

export function RewardedAdButton({ onReward, label = "Watch Ad for Reward", disabled = false }: RewardedAdButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  if (!isAdMobAvailable()) {
    return null;
  }

  const handleShowAd = async () => {
    try {
      setIsLoading(true);
      const rewarded = await showRewardedAd();
      
      if (rewarded) {
        toast({
          title: "Reward Earned! 🎉",
          description: "You've unlocked a bonus!",
        });
        onReward();
      } else {
        toast({
          title: "Ad Dismissed",
          description: "Complete the ad to earn the reward",
        });
      }
    } catch (error) {
      console.error('Error showing rewarded ad:', error);
      toast({
        title: "Error",
        description: "Could not load ad. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      onClick={handleShowAd}
      disabled={disabled || isLoading}
      variant="secondary"
      className="gap-2"
    >
      <Gamepad2 className="w-4 h-4" />
      {isLoading ? "Loading..." : label}
    </Button>
  );
}
