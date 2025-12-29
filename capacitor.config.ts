import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.nexusmatch.app",
  appName: "Nexus Match",
  webDir: "client/dist/client",

  server: {
    androidScheme: "https",
    iosScheme: "https",
  },
  plugins: {
    // --- THIS IS THE MISSING PART CAUSING THE CRASH ---
    FirebaseAuthentication: {
      skipNativeAuth: false,
      providers: ["google.com"]
    },
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "32328109312-3q5q1l1l1l1l1l1l1l1l1l1l1l1l1l1l.apps.googleusercontent.com",
      forceCodeForRefreshToken: true
    },
    AdMob: {
      appId: "ca-app-pub-4278995521540923",
      testingDevices: [],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
      // For development: comment out to use test ads
      // For production: uncomment to use real ads
      // initializeForTesting: false,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#0a0e1a",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;