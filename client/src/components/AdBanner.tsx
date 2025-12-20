import { useEffect } from 'react';
import { showBannerAd, hideBannerAd } from '@/lib/admob';

interface AdBannerProps {
  visible?: boolean;
}

export function AdBanner({ visible = true }: AdBannerProps) {
  useEffect(() => {
    if (visible) {
      showBannerAd();
    } else {
      hideBannerAd();
    }
    
    return () => {
      hideBannerAd();
    };
  }, [visible]);

  return null;
}
