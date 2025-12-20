import { useEffect } from 'react';
import { showBannerAd, hideBannerAd, isAdMobAvailable } from '@/lib/admob';

interface AdBannerProps {
  visible?: boolean;
}

export function AdBanner({ visible = true }: AdBannerProps) {
  useEffect(() => {
    // Only show ads on native mobile platforms
    if (!isAdMobAvailable()) return;

    if (visible) {
      showBannerAd();
    } else {
      hideBannerAd();
    }
    
    return () => {
      hideBannerAd();
    };
  }, [visible]);

  // Ads are managed by Capacitor plugin - this component just triggers show/hide
  return null;
}
