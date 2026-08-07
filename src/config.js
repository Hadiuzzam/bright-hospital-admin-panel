import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';
import 'firebase/compat/database';
import 'firebase/compat/functions';

export const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'PASTE_YOUR_FIREBASE_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'brighthospital-46154.firebaseapp.com',
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL || 'https://brighthospital-46154-default-rtdb.asia-southeast1.firebasedatabase.app',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'brighthospital-46154',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'brighthospital-46154.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'PASTE_YOUR_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'PASTE_YOUR_APP_ID',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || 'PASTE_YOUR_MEASUREMENT_ID',
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

export const app = firebase.app();
export const auth = firebase.auth();
export const firestore = firebase.firestore();
export const storage = firebase.storage();
export const functions = firebase.app().functions('asia-southeast1');

// Optional only for live queue/presence later. Main HMS data is now Firestore.
export const realtimeDb = firebase.database();

export function createSecondaryAuth() {
  const appName = `secondary-${Date.now()}`;
  const secondaryApp = firebase.initializeApp(firebaseConfig, appName);
  return {
    app: secondaryApp,
    auth: secondaryApp.auth(),
  };
}

export default firebase;
