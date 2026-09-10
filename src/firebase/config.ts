/**
 * Firebase 초기화.
 *
 * 웹 앱 구성은 비밀이 아니다. 그래도 저장소에 박아 두지 않고 EXPO_PUBLIC_* 로 받는다.
 * 값이 비어 있으면 온라인 기능 전체가 조용히 꺼진다 (로컬 대전은 그대로 된다).
 */

import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  connectAuthEmulator,
  getAuth,
  initializeAuth,
  type Auth,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore';
import { Platform } from 'react-native';

import { nativePersistence } from './persistence';

const config = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};

const useEmulator = process.env.EXPO_PUBLIC_FIREBASE_EMULATOR === '1';

/** 구성이 채워져 있는가. 비어 있으면 온라인 메뉴를 잠근다. */
export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

let app: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let dbInstance: Firestore | null = null;

function ensureApp(): FirebaseApp {
  if (app) return app;
  if (!isFirebaseConfigured()) {
    throw new Error(
      'Firebase 구성이 비어 있다. .env.example 을 .env 로 복사해 EXPO_PUBLIC_FIREBASE_* 를 채워라.',
    );
  }
  app = getApps().length ? getApp() : initializeApp(config as Record<string, string>);
  return app;
}

export function getAuthClient(): Auth {
  if (authInstance) return authInstance;
  const created = ensureApp();

  // 웹은 브라우저 저장소를 기본으로 쓰고, 네이티브만 AsyncStorage 를 끼운다.
  const persistence = Platform.OS === 'web' ? null : nativePersistence();
  authInstance = persistence ? initializeAuth(created, { persistence }) : getAuth(created);

  if (useEmulator) {
    connectAuthEmulator(authInstance, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  return authInstance;
}

export function getDb(): Firestore {
  if (dbInstance) return dbInstance;
  dbInstance = getFirestore(ensureApp());
  if (useEmulator) connectFirestoreEmulator(dbInstance, '127.0.0.1', 8080);
  return dbInstance;
}

export const FIREBASE_EMULATOR = useEmulator;
