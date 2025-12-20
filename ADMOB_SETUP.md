# AdMob Integration Setup Guide

## Overview
Your NexusMatch app is configured with Google AdMob for monetization. This guide covers everything needed to deploy with ads to the Google Play Store.

## Ad Configuration

### Production Ad Units
- **App ID**: `ca-app-pub-4278995521540923`
- **Banner Ad Unit**: `ca-app-pub-4278995521540923/9530455718` (NexusMatch_Main_Bottom_Banner)
- **Rewarded Ad Unit**: `ca-app-pub-4278995521540923/8211109962` (NexusMatch_Boost_Rewarded)

### File Locations
- **AdMob Configuration**: `client/src/lib/admob.ts`
- **Capacitor Config (Production)**: `capacitor.config.ts`
- **Capacitor Config (Dev)**: `capacitor.config.dev.ts`
- **Banner Component**: `client/src/components/AdBanner.tsx`
- **app-ads.txt**: `public/app-ads.txt`

## Implementation

### Banner Ads
Banner ads are automatically displayed at the bottom of screens on mobile platforms using the `AdBanner` component.

**Usage in Components:**
```tsx
import { AdBanner } from '@/components/AdBanner';

export function MyComponent() {
  return (
    <div>
      <h1>Content</h1>
      <AdBanner visible={true} />
    </div>
  );
}
```

### Rewarded Ads
Implement in features where users earn rewards (like "Boost" feature):

```tsx
import { showRewardedAd } from '@/lib/admob';

async function handleBoostClick() {
  try {
    const userWatched = await showRewardedAd();
    if (userWatched) {
      // Grant user reward (boost matches, etc.)
      console.log('User watched ad and earned reward');
    }
  } catch (error) {
    console.error('Error showing rewarded ad:', error);
  }
}
```

## Environment Variables
The following variables are already set in your environment:
- `VITE_ADMOB_BANNER_ID`: Banner ad unit ID
- `VITE_ADMOB_REWARDED_ID`: Rewarded ad unit ID

## app-ads.txt
The `app-ads.txt` file is located at `public/app-ads.txt` with the required IAB verification:
```
google.com, pub-4278995521540923, DIRECT, f08c47fec0942fa0
```

**Important**: You must also publish this file on your developer website at:
```
https://yourdomain.com/app-ads.txt
```
Replace `yourdomain.com` with your actual domain. Wait 24 hours for AdMob to verify it.

## Building for Android

### Build APK in Android Studio
1. Open your project in Android Studio
2. Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**
3. Sign with your release keystore
4. Wait for the APK to be generated

### Build Command (Alternative)
```bash
npm run cap:build  # Build frontend and sync to Android
```

## Play Store Submission

### Pre-Submission Checklist
- [ ] AdMob app is in production mode (`testMode: false` in admob.ts)
- [ ] Banner ads display at bottom of feed
- [ ] Rewarded ads work in boost feature
- [ ] app-ads.txt published on your website
- [ ] Waited 24+ hours for AdMob verification
- [ ] All required app screenshots added
- [ ] Privacy policy URL added
- [ ] Content rating completed

### Step-by-Step Play Store Upload
1. Go to [Google Play Console](https://play.google.com/console)
2. Create new app or select existing
3. Fill out app details and content rating
4. Upload signed APK:
   - Navigate to **Release > Production**
   - Click **Create new release**
   - Upload your signed APK
   - Review and confirm
5. Submit for review
6. Wait for approval (typically 24-48 hours)

## Testing Before Publishing

### Test Device Setup
1. Note your device's Android ID
2. Add to AdMob's test devices for safe testing
3. Or use test ad unit IDs (commented in admob.ts)

### Monitor AdMob Performance
- Check impressions, clicks, and earnings in [AdMob Dashboard](https://admob.google.com/)
- Monitor for invalid traffic warnings
- Ensure ads aren't shown too frequently

## Important Notes

### Ad Revenue
- **Banner ads**: Lower pay-per-impression (~$0.50-$2 per 1000 impressions)
- **Rewarded ads**: Higher pay-per-view (~$5-$15 per 1000 views)
- Earnings vary based on user location and ad quality

### Policies to Follow
- ✅ Show ads in user-facing content
- ✅ Allow users to interact with apps between ads
- ❌ Don't show excessive ads (risk account suspension)
- ❌ Don't click your own ads
- ❌ Don't incentivize clicking ads

### Updates Needed Before Production
Check that `testMode: false` is set in `client/src/lib/admob.ts` line 12

## Troubleshooting

### Ads Not Showing
- Verify testMode is `false` in admob.ts
- Check that you're running on actual Android device (not browser)
- Ensure ad unit IDs are correct
- Check AdMob dashboard for account status

### Build Fails
- Run: `npm run cap:sync` to sync Capacitor files
- Update Android SDK if needed
- Clear Android Studio cache: **File > Invalidate Caches**

## Support
- [AdMob Documentation](https://developers.google.com/admob/android/quick-start)
- [Capacitor AdMob Plugin](https://github.com/capacitor-community/admob)
- [Play Store Help](https://support.google.com/googleplay)
