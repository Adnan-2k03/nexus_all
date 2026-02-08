# NexusMatch - Gaming Community App

## Project Status: ✅ Running & Ready for Play Store

The app is **production-ready** with authentication, monetization, and Play Store deployment configured.

### What's Been Fixed (Feb 08, 2026)

#### 1. **Logout Issue in Dev Mode** ✅
- Fixed `devAuthMiddleware` to allow logout requests to bypass auto-authentication
- Implemented explicit session destruction and cookie clearing in `/api/auth/logout`
- Users can now successfully log out even when `AUTH_DISABLED=true` is set

#### 2. **iOS Support Initialized** ✅
- Added iOS native platform via Capacitor
- Configured `iosScheme` in `capacitor.config.ts`
- Project is now ready for Xcode builds

### Database
- ✅ PostgreSQL created and schema deployed
- ✅ All Drizzle migrations successful
- ✅ Session storage configured

### Architecture
- **Frontend**: React + Vite (port 5000)
- **Backend**: Express.js (same port, shared)
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js + Firebase
- **Session**: PostgreSQL-backed express-session
- **Mobile**: Capacitor (Android & iOS)

### iOS Deployment (New)
1. Ensure `ios/` directory is present
2. Run `npm run build` to build the web project
3. Run `npx cap copy ios` to sync files
4. Use a Mac with Xcode to open the `ios/App/App.xcworkspace`
5. Configure signing and build for device/simulator

### Deployment
- Production config is set to `autoscale` with:
  - Build: `npm run build`
  - Run: `npm run start`
- Ready to publish to Replit Deployments

## Monetization & Play Store (Added Dec 20, 2025)

### AdMob Integration ✅
- **Banner Ads**: Bottom of screens (automatic)
- **Rewarded Ads**: For player boosts & premium features
- **Interstitial Ads**: Between page transitions
- **Ad Components**:
  - `AdBanner.tsx` - Shows banner ads
  - `RewardedAdButton.tsx` - Rewards for watching ads

### Usage in Components
```tsx
import { AdBanner } from '@/components/AdBanner';
import { RewardedAdButton } from '@/components/RewardedAdButton';

// In your page:
<AdBanner visible={true} />
<RewardedAdButton 
  onReward={() => console.log('User earned reward')}
  label="Watch Ad for Boost"
/>
```

### Play Store Deployment
**Read**: `PLAYSTORE_DEPLOYMENT.md` for complete setup guide

**Quick Start**:
1. Replace test AdMob IDs with production IDs
2. Generate signing key with keytool
3. Build release bundle
4. Create Google Play Console account
5. Upload AAB file
6. Complete app listing & metadata
7. Submit for review (24-48 hours)

### Revenue Model
```
Estimated Monthly (at 1000 DAU):
├─ Banner Ads: $50-100/month
├─ Rewarded Ads: $200-500/month
└─ Interstitial: $100-200/month
Total: $350-800/month potential
```

## Next Steps
1. Get production AdMob IDs from [admob.google.com](https://admob.google.com)
2. Update IDs in `client/src/lib/admob.ts`
3. Follow `PLAYSTORE_DEPLOYMENT.md` for submission
4. User login is fully functional - test on Android first
5. Monitor Play Store metrics after launch

## Files for Play Store
- `PLAYSTORE_DEPLOYMENT.md` - Deployment guide
- `client/src/components/AdBanner.tsx` - Banner ads
- `client/src/components/RewardedAdButton.tsx` - Rewarded ads
- `capacitor.config.ts` - AdMob plugin config
- `android/` - Build & signing config
