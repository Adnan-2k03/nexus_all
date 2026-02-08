import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import Constants from 'expo-constants';

const firebaseConfig = {
  apiKey: Constants.expoConfig?.extra?.VITE_FIREBASE_WEB_API_KEY,
  authDomain: `${Constants.expoConfig?.extra?.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
  projectId: Constants.expoConfig?.extra?.VITE_FIREBASE_PROJECT_ID,
  storageBucket: `${Constants.expoConfig?.extra?.VITE_FIREBASE_PROJECT_ID}.firebasestorage.app`,
  appId: Constants.expoConfig?.extra?.VITE_FIREBASE_APP_ID,
};

const isConfigured = !!(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

export const app = isConfigured ? initializeApp(firebaseConfig) : null;
export const auth = app ? getAuth(app) : null;

export function isFirebaseConfigured() {
  return isConfigured && auth !== null;
}
