# Android Build Guide for Nexus Match

This guide explains how to build the Android APK and publish to Google Play Store.

## Prerequisites

You'll need a computer with these installed:
- **Android Studio** (free): https://developer.android.com/studio
- **Node.js** (v18+): https://nodejs.org/
- **Git**: https://git-scm.com/

## Step 1: Download Your Project

### Option A: Clone from Replit
1. In Replit, click the three dots menu → "Download as zip"
2. Extract the zip file on your computer
3. Open a terminal in that folder

### Option B: Use Git (if connected to GitHub)
```bash
git clone https://github.com/YOUR_USERNAME/nexus_final.git
cd nexus_final
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Build the Web App

```bash
npm run build:frontend
```

This creates the `dist/public` folder that Capacitor will use.

## Step 4: Sync with Android

```bash
npx cap sync android
```

This copies your web app into the Android project.

## Step 5: Open in Android Studio

```bash
npx cap open android
```

This opens Android Studio with your project.

## Step 6: Build Debug APK (For Testing)

In Android Studio:
1. Wait for Gradle to finish syncing (bottom progress bar)
2. Go to **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for build to complete
4. Click "locate" in the notification to find your APK
5. The APK is at: `android/app/build/outputs/apk/debug/app-debug.apk`

You can now install this APK on your Android phone for testing!

## Step 7: Set Up AdMob for Production

### Create AdMob Account
1. Go to https://admob.google.com/
2. Sign in with Google
3. Click "Apps" → "Add App"
4. Select "Android" and search for your app (or add manually)
5. Copy your **App ID** (looks like: ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX)

### Create Ad Units
1. In AdMob, go to your app → "Ad units"
2. Create these ad types:
   - **Banner** (displays at bottom of screen)
   - **Rewarded** (user watches for rewards - highest paying!)
   - **Interstitial** (full screen between pages)
3. Copy each **Ad Unit ID**

### Update Your Code
Open `client/src/lib/admob.ts` and replace:

```typescript
const ADMOB_CONFIG = {
  testMode: false,  // ← Change to false for production
  
  appId: 'ca-app-pub-YOUR-APP-ID',  // ← Your App ID
  bannerId: 'ca-app-pub-YOUR-BANNER-ID',  // ← Your Banner ID
  rewardedId: 'ca-app-pub-YOUR-REWARDED-ID',  // ← Your Rewarded ID
  interstitialId: 'ca-app-pub-YOUR-INTERSTITIAL-ID',  // ← Your Interstitial ID
};
```

Also update `capacitor.config.ts`:

```typescript
plugins: {
  AdMob: {
    appId: 'ca-app-pub-YOUR-APP-ID',  // ← Same App ID here
    // ... rest of config
  }
}
```

## Step 8: Build Release APK (For Play Store)

### Create Signing Key
```bash
cd android
keytool -genkey -v -keystore nexus-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias nexus-key
```

Save your password! You'll need it for every release.

### Configure Signing
Create file `android/keystore.properties`:
```
storePassword=YOUR_PASSWORD
keyPassword=YOUR_PASSWORD
keyAlias=nexus-key
storeFile=../nexus-release-key.jks
```

### Build Release
In Android Studio:
1. **Build → Generate Signed Bundle / APK**
2. Select "Android App Bundle" (for Play Store) or "APK"
3. Choose your keystore and enter passwords
4. Select "release" build variant
5. Click "Create"

Your signed APK/Bundle will be in: `android/app/release/`

## Step 9: Publish to Google Play Store

### Create Developer Account
1. Go to https://play.google.com/console
2. Pay $25 one-time fee
3. Complete account setup

### Create App Listing
1. Click "Create app"
2. Fill in app name, description, etc.
3. Upload screenshots (phone + tablet)
4. Add privacy policy URL
5. Complete content rating questionnaire

### Upload Your App
1. Go to "Production" → "Create new release"
2. Upload your AAB file (Android App Bundle)
3. Add release notes
4. Submit for review

Google reviews typically take 1-3 days.

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Build web app
npm run build:frontend

# Sync to Android
npx cap sync android

# Open Android Studio
npx cap open android

# One-liner for quick rebuild
npm run build:frontend && npx cap sync android
```

## Troubleshooting

### "Gradle sync failed"
- Make sure Android Studio has downloaded SDK 34
- Go to **File → Settings → SDK Manager** and install Android 14 (API 34)

### "App crashes on launch"
- Check that `dist/public` folder exists
- Run `npm run build:frontend` again
- Run `npx cap sync android` again

### "AdMob not showing ads"
- Make sure you've replaced test IDs with production IDs
- Set `testMode: false` in admob.ts
- AdMob may take 24-48 hours to serve real ads

### "Build fails with Java error"
- Install JDK 17: https://adoptium.net/
- Set JAVA_HOME environment variable

## Estimated Earnings

With AdMob on Android:
- **Banner ads**: $1-5 per 1000 impressions
- **Interstitial ads**: $5-15 per 1000 impressions  
- **Rewarded ads**: $10-30 per 1000 completions

Example: 10,000 daily active users = $50-200/day potential

---

**Questions?** The Capacitor docs are helpful: https://capacitorjs.com/docs/android
