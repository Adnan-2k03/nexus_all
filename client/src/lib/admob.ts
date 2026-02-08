import { AdMob, BannerAdOptions, BannerAdSize, BannerAdPosition, RewardAdOptions, AdLoadInfo, AdMobRewardItem, RewardAdPluginEvents, RewardInterstitialAdOptions, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

const isNative = typeof Capacitor !== 'undefined' && !!Capacitor.isNativePlatform && (typeof Capacitor.isNativePlatform === 'function' ? Capacitor.isNativePlatform() : !!Capacitor.isNativePlatform);

// AdMob Configuration
// Use Google's test ad units for development/testing
// Switch to production IDs after testing
const ADMOB_CONFIG = {
  // Enable test mode for development (shows test ads)
  // Set to false when using production ad unit IDs for Play Store
  testMode: false,
  
  // Your AdMob App ID (from AdMob console)
  appId: 'ca-app-pub-4278995521540923~8773515735',
  
  // Banner Ad Unit ID - Using Google's test ad unit for development
  // Production: 'ca-app-pub-4278995521540923/9530455718'
  // Test: 'ca-app-pub-3940256099942544/6300978111'
  bannerId: 'ca-app-pub-3940256099942544/6300978111',
  
  // Rewarded Ad Unit ID - NexusMatch_Boost_Rewarded
  // Production: 'ca-app-pub-4278995521540923/8211109962'
  // Test: 'ca-app-pub-3940256099942544/5224354917'
  rewardedId: 'ca-app-pub-4278995521540923/8211109962',
  
  // Interstitial Ad Unit ID (full screen ads between pages/tournaments)
  // Production: 'ca-app-pub-4278995521540923/4322802007'
  // Test: 'ca-app-pub-3940256099942544/1033173712'
  interstitialId: 'ca-app-pub-4278995521540923/4322802007',
  
  // Rewarded Interstitial Ad Unit ID (rewards with interstitial format)
  // Production: 'ca-app-pub-4278995521540923/4127183271'
  // Test: 'ca-app-pub-3940256099942544/5354046152'
  rewardedInterstitialId: 'ca-app-pub-4278995521540923/4127183271',
  
  // App Open Ad Unit ID (shown when app is opened)
  // Production: 'ca-app-pub-4278995521540923/7234567890'
  // Test: 'ca-app-pub-3940256099942544/5677046153'
  appOpenAdId: 'ca-app-pub-3940256099942544/5677046153',
};

export const initializeAdMob = async () => {
  if (!isNative) {
    console.log('AdMob is only available on native platforms');
    return;
  }

  try {
    await AdMob.initialize({
      testingDevices: [], // Leave empty for testing on public ad units
      initializeForTesting: ADMOB_CONFIG.testMode,
    });
    console.log('AdMob initialized successfully');
    
    // Automatically show banner ad after initialization
    if (isNative) {
      setTimeout(() => {
        showBannerAd();
      }, 1000);
    }
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

export const showInterstitialAd = async (): Promise<void> => {
  if (!isNative) {
    console.log('Interstitial ads are only available on native platforms');
    return;
  }

  const options: RewardInterstitialAdOptions = {
    adId: ADMOB_CONFIG.interstitialId,
    isTesting: ADMOB_CONFIG.testMode,
  };

  try {
    const dismissedListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      console.log('Interstitial ad dismissed');
      dismissedListener.remove();
    });

    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
    console.log('Interstitial ad shown');
  } catch (error) {
    console.error('Failed to show interstitial ad:', error);
  }
};

export const showRewardedInterstitialAd = async (): Promise<boolean> => {
  if (!isNative) {
    console.log('Rewarded interstitial ads are only available on native platforms');
    return false;
  }

  const options: RewardInterstitialAdOptions = {
    adId: ADMOB_CONFIG.rewardedInterstitialId,
    isTesting: ADMOB_CONFIG.testMode,
  };

  return new Promise(async (resolve, reject) => {
    let rewarded = false;

    try {
      const rewardedListener = await AdMob.addListener(RewardAdPluginEvents.Rewarded, (reward: AdMobRewardItem) => {
        console.log('User earned reward from interstitial:', reward);
        rewarded = true;
      });

      const dismissedListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
        console.log('Rewarded interstitial ad dismissed');
        rewardedListener.remove();
        dismissedListener.remove();
        resolve(rewarded);
      });

      await AdMob.prepareInterstitial(options);
      await AdMob.showInterstitial();
    } catch (error) {
      console.error('Failed to show rewarded interstitial ad:', error);
      reject(error);
    }
  });
};

export const showAppOpenAd = async (): Promise<void> => {
  if (!isNative) {
    console.log('App open ads are only available on native platforms');
    return;
  }

  const options: RewardInterstitialAdOptions = {
    adId: ADMOB_CONFIG.appOpenAdId,
    isTesting: ADMOB_CONFIG.testMode,
  };

  try {
    const dismissedListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, () => {
      console.log('App open ad dismissed');
      dismissedListener.remove();
    });

    await AdMob.prepareInterstitial(options);
    await AdMob.showInterstitial();
    console.log('App open ad shown');
  } catch (error) {
    console.error('Failed to show app open ad:', error);
  }
};

export const isAdMobAvailable = (): boolean => {
  return isNative;
};

// Helper function to get config (useful for debugging)
export const getAdMobConfig = () => ADMOB_CONFIG;
