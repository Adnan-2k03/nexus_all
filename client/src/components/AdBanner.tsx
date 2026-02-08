import { useEffect } from 'react';
import { showBannerAd, hideBannerAd, isAdMobAvailable } from '@/lib/admob';
import { useTestAds } from '@/contexts/TestAdsContext';

interface AdBannerProps {
  visible?: boolean;
}

export function AdBanner({ visible = true }: AdBannerProps) {
  const { showTestAds } = useTestAds();

  useEffect(() => {
    // Check if AdMob is available and it's a native platform
    const checkNative = () => {
      try {
        return typeof isAdMobAvailable === 'function' && isAdMobAvailable();
      } catch (e) {
        return false;
      }
    };
    
    if (checkNative()) {
      if (visible) {
        showBannerAd();
      } else {
        hideBannerAd();
      }
    }
    
    return () => {
      if (checkNative()) {
        hideBannerAd();
      }
    };
  }, [visible]);

  // Show test ad box when test mode is enabled
  if (showTestAds) {
    return (
      <div className="w-full bg-yellow-500/20 border-2 border-yellow-500 rounded-md p-4 mb-4 flex items-center justify-center" data-testid="test-ad-banner">
        <div className="text-center">
          <p className="text-yellow-700 dark:text-yellow-300 font-semibold text-sm">
            TEST AD PLACEMENT
          </p>
          <p className="text-yellow-600 dark:text-yellow-400 text-xs mt-1">
            Banner Ad (320x50 on mobile)
          </p>
        </div>
      </div>
    );
  }

  // Ads are managed by Capacitor plugin - this component just triggers show/hide
  return null;
}
