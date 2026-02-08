# Multi-Platform Technical Overview

This project is built using a **Capacitor**-based architecture, which allows a single codebase to run as a Web Application, an Android App, and an iOS App.

## Technology Breakdown

### 1. Web Application (The Core)
*   **Framework**: React with Vite.
*   **Styling**: Tailwind CSS and Shadcn UI.
*   **Backend**: Express.js server with PostgreSQL (via Drizzle ORM).
*   **Role**: Serves as the primary interface and the source for the mobile apps.

### 2. Android App
*   **Tech**: Capacitor Android Platform.
*   **How it works**: Capacitor wraps the web application in a native Android "WebView".
*   **Native Features**: Uses Capacitor plugins to access device hardware (Camera, Push Notifications, etc.) via JavaScript.
*   **Files**: Located in the `/android` directory.

### 3. iOS App
*   **Status**: On the way / Supported.
*   **Tech**: Capacitor iOS Platform.
*   **How it works**: Similar to Android, it wraps the web app in a native iOS "WKWebView".
*   **Conversion**: To convert/enable iOS, you add the iOS platform (`npx cap add ios`), which generates an Xcode project.
*   **Files**: Located in the `/ios` directory.

## Key Technical Differences

| Feature | Web | Android | iOS |
| :--- | :--- | :--- | :--- |
| **Runtime** | Browser (Chrome/Safari/etc) | Android WebView | WKWebView (iOS) |
| **Distribution** | URL / Domain | Google Play Store (.apk/.aab) | Apple App Store |
| **Native API Access** | Limited (Web APIs) | Full (via Capacitor Plugins) | Full (via Capacitor Plugins) |
| **Build Tools** | Vite / Node.js | Android Studio / Gradle | Xcode / Swift |
| **Push Notifications** | Web Push API | Firebase Cloud Messaging (FCM) | Apple Push Notification service (APNs) |

## Deployment Strategy
*   **Web**: Published to a web server (like Replit or Vercel).
*   **Mobile**: The web code is "synced" into the native folders (`/android` and `/ios`) using `npx cap sync`, then built using their respective native IDEs.