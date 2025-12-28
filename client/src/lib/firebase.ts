import { initializeApp } from 'firebase/app';
import { getAuth, onIdTokenChanged } from 'firebase/auth';
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from 'firebase/app-check';
import { getApiUrl } from './api';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const isConfigured = Object.values(firebaseConfig).every(value => value !== undefined);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;

if (app && import.meta.env.VITE_RECAPTCHA_SITE_KEY) {
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(import.meta.env.VITE_RECAPTCHA_SITE_KEY),
    isTokenAutoRefreshEnabled: true
  });
}

export const auth = app ? getAuth(app) : null;

// Set up persistent listener for ID token changes
// This listener will be active from app initialization and will catch all authentication events
if (auth) {
  onIdTokenChanged(auth, async (user) => {
    try {
      if (user) {
        // User signed in - sync token with backend
        const idToken = await user.getIdToken();
        await fetch(getApiUrl('/api/auth/firebase-login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ idToken }),
          credentials: 'include',
        }).catch(err => console.error('Failed to sync token with backend:', err));
      } else {
        // User signed out
        await fetch(getApiUrl('/api/auth/logout'), {
          method: 'POST',
          credentials: 'include',
        }).catch(err => console.error('Failed to notify backend of logout:', err));
      }
    } catch (error) {
      console.error('Error in idTokenChanged listener:', error);
    }
  });
}

export function isFirebaseConfigured() {
  return isConfigured && auth !== null;
}
