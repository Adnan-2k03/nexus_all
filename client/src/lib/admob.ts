import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const isNative = Capacitor.isNativePlatform();

// AdMob Configuration
const ADMOB_CONFIG = {
  // Production mode - set to false to show production ads
  testMode: false,
  
  // Your AdMob App ID (from AdMob console)
  appId: 'ca-app-pub-4278995521540923',
  
  // Banner Ad Unit ID (NexusMatch_Main_Bottom_Banner)
  bannerId: import.meta.env.VITE_ADMOB_BANNER_ID || 'ca-app-pub-4278995521540923/9530455718',
  
  // Rewarded Ad Unit ID (NexusMatch_Boost_Rewarded - users watch for rewards)
  rewardedId: import.meta.env.VITE_ADMOB_REWARDED_ID || 'ca-app-pub-4278995521540923/8211109962',
  
  // Interstitial Ad Unit ID (full screen ads between pages)
  interstitialId: 'ca-app-pub-4278995521540923/1033173712',
};

export const initializeAdMob = async () => {
  if (!isNative) {
    console.log('AdMob is only available on native platforms');
    return;
  }

  try {
    await AdMob.initialize({
      testingDevices: ['YOUR_TEST_DEVICE_ID'],
      initializeForTesting: ADMOB_CONFIG.testMode,
    });
    console.log('AdMob initialized successfully');
  } catch (error) {
    console.error('Failed to initialize AdMob:', error);
  }
};

export const showBannerAd = async () => {
  if (!isNative) return;

  const options: BannerAdOptions = {
    adId: ADMOB_CONFIG.bannerId,
    adSize: BannerAdSize.BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: ADMOB_CONFIG.testMode,
  };

  try {
    await AdMob.showBanner(options);
  } catch (error) {
    console.error('Failed to show banner ad:', error);
  }
};

export const hideBannerAd = async () => {
  if (!isNative) return;
  
  try {
    await AdMob.hideBanner();
  } catch (error) {
    console.error('Failed to hide banner ad:', error);
  }
};

export const showRewardedAd = async (): Promise<boolean> => {
  if (!isNative) {
    console.log('Rewarded ads are only available on native platforms');
    return false;
  }

  const options: RewardAdOptions = {
    adId: ADMOB_CONFIG.rewardedId,
    isTesting: ADMOB_CONFIG.testMode,
  };

  return new Promise(async (resolve, reject) => {
    let rewarded = false;

    try {
      const rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Loaded, (info: AdLoadInfo) => {
        console.log('Rewarded ad loaded', info);
      });

      const dismissedListener = await AdMob.addListener(RewardAdPluginEvents.Dismissed, () => {
        console.log('Rewarded ad dismissed');
        rewardedListener.remove();
        dismissedListener.remove();
        rewardListener.remove();
        resolve(rewarded);
      });

      const rewardListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
        console.log('User earned reward:', reward);
        rewarded = true;
      });

      await AdMob.prepareRewardVideoAd(options);
      await AdMob.showRewardVideoAd();
    } catch (error) {
      console.error('Failed to show rewarded ad:', error);
      reject(error);
    }
  });
};

export const isAdMobAvailable = (): boolean => {
  return isNative;
};

// Helper function to get config (useful for debugging)
export const getAdMobConfig = () => ADMOB_CONFIG;
