/**
 * 웹용 인증 저장소.
 *
 * 브라우저는 firebase 가 알아서 IndexedDB 를 쓰므로 따로 끼울 것이 없다.
 * 네이티브 쪽은 persistence.native.ts 가 대신 쓰인다.
 */

import type { Persistence } from 'firebase/auth';

export function nativePersistence(): Persistence | null {
  return null;
}
