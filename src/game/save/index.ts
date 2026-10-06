/**
 * 판 저장 진입점.
 *
 * 화면은 getSaveBackend() 하나만 부른다. 지금은 언제나 기기 저장소다.
 * Firestore 로 옮길 때는 여기서 createFirestoreSaveBackend(uid) 를 돌려주면 된다
 * (firestore-backend.ts 머리말의 보안 규칙을 먼저 배포할 것).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

import { getLang, getT } from '../../i18n/use-t';
import { createDeviceSaveBackend, type SaveBackend } from './save-backend';
import { setSaveLocale } from './save-text';

// 순수 저장 모듈이 오류·요약 문구에 현재 언어를 쓰게 한다
setSaveLocale(() => ({ lang: getLang(), t: getT() }));

let device: SaveBackend | null = null;

export function getSaveBackend(): SaveBackend {
  device ??= createDeviceSaveBackend(AsyncStorage);
  return device;
}

export type { SaveBackend } from './save-backend';
export * from './save-model';
