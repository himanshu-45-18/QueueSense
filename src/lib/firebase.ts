import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBqEUTt9EpU1pTJso42Ima5_xLnX_mHnRk",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "queuesense-011.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "queuesense-011",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "queuesense-011.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "582308460243",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:582308460243:web:c7f7ea2d562d94f0480626",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-83NPEYG1NF",
};

// Initialize Firebase app singleton
export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Safe Analytics initialization
export let analytics: ReturnType<typeof getAnalytics> | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics optional in local environments
  });
}

export const isFirebaseConfigured = true;

export default app;
