/**
 * iOS·안드로이드용 인증 저장소.
 *
 * AsyncStorage 를 끼워야 앱을 껐다 켜도 같은 익명 계정으로 돌아온다.
 * 그래야 자리를 잃지 않고 다시 들어올 수 있다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as firebaseAuth from 'firebase/auth';
import type { Persistence } from 'firebase/auth';

type WithReactNative = {
  getReactNativePersistence?: (storage: unknown) => Persistence;
};

export function nativePersistence(): Persistence | null {
  const factory = (firebaseAuth as unknown as WithReactNative).getReactNativePersistence;
  return factory ? factory(AsyncStorage) : null;
}
