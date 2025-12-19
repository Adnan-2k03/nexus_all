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
    // --------------------------------------------------
    AdMob: {
      appId: "ca-app-pub-3940256099942544~3347511713",
      testingDevices: ["YOUR_TEST_DEVICE_ID"],
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
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