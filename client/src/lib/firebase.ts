import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: (typeof window !== 'undefined' && (window as any).EXPO_VITE_FIREBASE_WEB_API_KEY) || '',
  authDomain: `${(typeof window !== 'undefined' && (window as any).EXPO_VITE_FIREBASE_PROJECT_ID) || ''}.firebaseapp.com`,
  projectId: (typeof window !== 'undefined' && (window as any).EXPO_VITE_FIREBASE_PROJECT_ID) || '',
  storageBucket: `${(typeof window !== 'undefined' && (window as any).EXPO_VITE_FIREBASE_PROJECT_ID) || ''}.firebasestorage.app`,
  appId: (typeof window !== 'undefined' && (window as any).EXPO_VITE_FIREBASE_APP_ID) || '',
};

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

export function isFirebaseConfigured() {
  return isConfigured && auth !== null;
}
