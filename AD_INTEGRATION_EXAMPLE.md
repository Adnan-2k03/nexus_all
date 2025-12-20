# AdMob Integration Examples

## Quick Integration Guide

### 1. Add Banner Ad to Any Page

```tsx
import { AdBanner } from '@/components/AdBanner';

export function MyPage() {
  return (
    <div>
      <h1>My Page</h1>
      <p>Page content here...</p>
      
      {/* Banner ad at bottom */}
      <AdBanner visible={true} />
    </div>
  );
}
```

### 2. Add Rewarded Ad Button

```tsx
import { RewardedAdButton } from '@/components/RewardedAdButton';

export function ProfileBoostPage() {
  const handleReward = () => {
    // User watched ad and earned reward
    console.log('User earned boost!');
    // Give them the reward:
    // - Premium profile visibility
    // - Featured listing
    // - Extra match requests
    // - Unlock special badge
  };

  return (
    <div className="p-4">
      <h2>Boost Your Profile</h2>
      <p>Watch an ad to get featured!</p>
      
      <RewardedAdButton
        onReward={handleReward}
        label="Watch Ad for Boost"
      />
    </div>
  );
}
```

### 3. Conditional Ad Display

```tsx
import { AdBanner } from '@/components/AdBanner';
import { isAdMobAvailable } from '@/lib/admob';

export function DashboardPage() {
  const canShowAds = isAdMobAvailable(); // true only on native

  return (
    <div className="grid gap-4">
      {canShowAds && <AdBanner visible={true} />}
      
      <div className="player-list">
        {/* Game content */}
      </div>
    </div>
  );
}
```

## Best Places to Add Ads

### Banner Ads (Non-Intrusive)
- Bottom of player discovery list
- Bottom of chat screens
- Below player profiles
- During loading states

### Rewarded Ads (High-Value)
- Premium profile boost
- Feature in player discovery
- Unlock limited time features
- Get extra match requests
- Remove ads temporarily

### Interstitial Ads (Between Pages)
Already configured in `admob.ts`, shows between major page transitions

## Revenue Optimization Tips

### 1. Placement Matters
```
High Revenue: Rewarded > Interstitial > Banner
High CTR: Places where users naturally pause
Best: Multiple ad types on same page
```

### 2. Balance with UX
```
DO:
- One banner ad per page (usually bottom)
- Rewarded ads with clear benefit
- Ads that don't block essential features

DON'T:
- Multiple banner ads on same page
- Force ads before showing content
- Ads that cover buttons/interactive elements
```

### 3. Frequency Capping
To avoid annoying users:
```tsx
// In your component
const [adsShownToday, setAdsShownToday] = useState(0);

if (adsShownToday < 3) {
  // Show rewarded ad button
}
```

## Testing with Test IDs

During development, use test Ad Unit IDs (already in code):
```
Test Banner: ca-app-pub-3940256099942544/6300978111
Test Rewarded: ca-app-pub-3940256099942544/5224354917
Test Interstitial: ca-app-pub-3940256099942544/1033173712
```

This prevents:
- Your ads being invalid
- Your account being suspended
- Invalid traffic warnings

## Switching to Production

When ready to publish:

1. **Get Production IDs** from AdMob Console:
   - Create Ad Units for your app
   - Copy the Ad Unit IDs

2. **Update `client/src/lib/admob.ts`**:
```typescript
const ADMOB_CONFIG = {
  testMode: false,  // ← Switch to false
  appId: 'ca-app-pub-XXXXX~XXXXX',  // Your real ID
  bannerId: 'ca-app-pub-XXXXX/XXXXX',
  rewardedId: 'ca-app-pub-XXXXX/XXXXX',
  interstitialId: 'ca-app-pub-XXXXX/XXXXX',
};
```

3. **Build Release Version**:
```bash
npm run build
npx cap build android
```

## Monitoring Revenue

In AdMob Console:
- **Home**: Today's earnings
- **Ad Units**: Performance by placement
- **Mediation**: Multiple ad networks
- **Reports**: Detailed analytics

Track:
- **Impressions**: Ad views
- **Clicks**: User clicks (CTR)
- **RPM**: Revenue per 1000 impressions
- **Fill Rate**: Percentage of requested ads shown

## Common Issues

| Issue | Solution |
|-------|----------|
| No ads showing | Verify testMode: true, check Ad Unit IDs |
| Low fill rate | Wait 24hrs after setup, check targeting |
| Account suspended | Used production IDs while testing - switch to test IDs |
| Ads not loading | Check network, verify AdMob initialized |

## Expected Performance

| Metric | Range |
|--------|-------|
| CTR (Banner) | 0.5-2% |
| CPM (Banner) | $0.50-$3 |
| CPM (Rewarded) | $2-$8 |
| RPM | $1-$5 per 1000 impressions |

## Monthly Revenue Estimate

```
Users: 1000/month
Ads/User: 5 per session
RPM: $2

Revenue = (1000 * 5 * $2) / 1000 = $10/month
At 10k users = $100/month
At 100k users = $1000/month
```

---

**Need help?** Check the official [AdMob documentation](https://support.google.com/admob)
