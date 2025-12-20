# NexusMatch - Google Play Store Deployment Guide

## Overview
This guide helps you prepare and deploy NexusMatch to the Google Play Store.

## Pre-Deployment Checklist

### 1. Replace AdMob Test IDs with Production IDs
- **File**: `client/src/lib/admob.ts`
- **Update these values**:
  ```typescript
  appId: 'YOUR_PRODUCTION_APP_ID',      // From AdMob console
  bannerId: 'YOUR_PRODUCTION_BANNER_ID',
  rewardedId: 'YOUR_PRODUCTION_REWARD_ID',
  interstitialId: 'YOUR_PRODUCTION_INTERSTITIAL_ID',
  ```
- Set `testMode: false` when ready

### 2. Update App Version & Build Number
- **File**: `android/app/build.gradle`
  ```gradle
  android {
    defaultConfig {
      versionCode = 1        // Increment for each release
      versionName = "1.0.0"  // Semantic versioning
    }
  }
  ```

### 3. Generate Signing Key
```bash
# Navigate to Android directory
cd android

# Generate keystore (run this ONCE)
keytool -genkey -v -keystore nexusmatch.keystore \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias nexusmatch_key

# Output: nexusmatch.keystore file (save this safely!)
```

### 4. Configure Gradle Signing
- **File**: `android/app/build.gradle`
  ```gradle
  android {
    signingConfigs {
      release {
        storeFile file('nexusmatch.keystore')
        storePassword 'YOUR_STORE_PASSWORD'
        keyAlias 'nexusmatch_key'
        keyPassword 'YOUR_KEY_PASSWORD'
      }
    }
    buildTypes {
      release {
        signingConfig signingConfigs.release
        minifyEnabled true
        proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
      }
    }
  }
  ```

### 5. Build Signed APK/AAB
```bash
# From Android directory
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## Google Play Store Setup

### 1. Create Developer Account
- Go to [Google Play Console](https://play.google.com/apps/publish)
- Pay $25 one-time registration fee
- Set up payment & tax info

### 2. Create App Listing
- Click "Create App"
- App name: `NexusMatch`
- Category: `Games`
- Content rating form → Rate your app

### 3. Privacy Policy
- Create a privacy policy (Termly, iubenda, or similar)
- Upload to a public URL
- Add to Play Store listing

### 4. App Details
- **Title**: NexusMatch - Find Your Gaming Partner
- **Short Description**: Join the ultimate gaming community. Match with players, voice chat, and dominate together.
- **Full Description**: 
  ```
  🎮 NexusMatch - Your Gaming Partner Awaits
  
  ✨ Features:
  • Instant Matchmaking with players of your skill level
  • Real-time Voice Channels for seamless communication
  • Find players by game, skill, and playstyle
  • Connect with your perfect gaming squad
  
  🔐 Privacy First:
  • Google authentication for security
  • No spam or fake profiles
  • Player rating system for community trust
  ```

### 5. Screenshots (Min 2, Max 8)
- Portrait screenshots: 1080 x 1920 px
- Use Figma/Canva to create mockups showing:
  - Login/Auth screen
  - Player discovery
  - Matchmaking
  - Voice chat
  - User profile

### 6. Icon & Banner
- **Icon**: 512 x 512 px (rounded corners)
- **Feature Graphic**: 1024 x 500 px

## Monetization Settings

### AdMob Integration
1. Go to [AdMob Console](https://admob.google.com)
2. Create new app: `com.nexusmatch.app`
3. Create Ad Units:
   - Banner (320x50, 320x100)
   - Rewarded
   - Interstitial
4. Copy Ad Unit IDs to `client/src/lib/admob.ts`

### Monetization Strategy
```
Revenue Sources:
├─ Banner Ads (bottom of screens)
├─ Rewarded Ads (player boosts, profile highlights)
├─ Interstitial Ads (between matchmaking pages)
└─ Premium Pass (optional future)
```

## Testing Before Upload

### 1. Internal Testing
```bash
# In Android Studio
- Run release build on real device
- Test all features work
- Check ad loading/displaying
- Verify Firebase authentication
```

### 2. Beta Testing (Optional but Recommended)
- Play Store → Testing → Beta testers
- Add test email addresses
- Share beta link with users
- Collect feedback for 1-2 weeks

### 3. Use Test Device
Add your test device to AdMob:
```
In AdMob Console:
Settings → Apps → Select your app → Ad Units → Add Test Device
Add your device's Advertising ID
```

## Submission Steps

1. **Fill App Listing**
   - Content rating: Complete questionnaire
   - Target audience
   - Permissions: Verify minimum required

2. **Upload Release Bundle**
   - Play Console → Release → Create Release
   - Upload `.aab` file
   - Review permission warnings
   - Add release notes

3. **Review & Publish**
   - Initial review: 24-48 hours
   - Google verifies:
     - Policy compliance
     - Ad behavior (AdMob)
     - Permission appropriateness
     - Privacy policy link

4. **Launch**
   - Start with staged rollout (10% → 50% → 100%)
   - Monitor crash reports
   - Gather user reviews

## Post-Launch Monitoring

### In Play Console
- **Ratings & Reviews**: Respond to feedback
- **Crashes**: Monitor ANR & crash reports
- **Vitals**: Check app startup time, jank metrics
- **User Acquisition**: Track installs & retention

### Update Strategy
```
v1.0.0: Initial release
v1.0.1: Bug fixes
v1.1.0: New features
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| App rejected for permissions | Remove unnecessary permissions from AndroidManifest.xml |
| AdMob not approved | Ensure ads display properly, no ad clicking loops |
| Firebase authentication fails | Verify SHA-1 fingerprint in Firebase Console |
| Build fails | Update gradle version in `gradle-wrapper.properties` |

## Important Files

| File | Purpose |
|------|---------|
| `AndroidManifest.xml` | App permissions & configuration |
| `android/app/build.gradle` | Build settings & signing |
| `capacitor.config.ts` | Capacitor plugins & settings |
| `client/src/lib/admob.ts` | AdMob configuration |

## Useful Links
- [Google Play Console](https://play.google.com/apps/publish)
- [AdMob Console](https://admob.google.com)
- [Firebase Console](https://console.firebase.google.com)
- [Capacitor Android Docs](https://capacitorjs.com/docs/android)

## Safety Tips
- **Keep keystore.jks safe** - You can't recover it
- **Don't commit keystore to git** - Add to `.gitignore`
- **Save all passwords** - You'll need them for updates
- **Test thoroughly** - Bad reviews hurt visibility

---

**You're ready to take NexusMatch to the Play Store! 🚀**
