/**
 * 뱅! 보상 정산 Cloud Functions.
 *
 * 지갑(users/{uid}/wallet)은 여기서만 쓴다. 클라이언트는 읽기만 한다 (firestore.rules).
 * 엔진·AI·경제 모듈은 ../src/game 에서 esbuild 가 번들한다 (build.mjs).
 *
 *   settleRoom      온라인 방이 끝나면 자리에 앉은 사람이 부른다. 멱등
 *   onMatchCreated  로컬 판 기록이 올라오면 돈다
 *
 * 리전은 us-central1: Firestore 가 nam5(미국 멀티리전)에 있다.
 */

import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { setGlobalOptions } from 'firebase-functions/v2';

import { onMatchCreatedHandler } from './settle-match';
import { settleRoomHandler } from './settle-room';

setGlobalOptions({ region: 'us-central1', maxInstances: 10 });

initializeApp();
const db = getFirestore();

export const settleRoom = settleRoomHandler(db);
export const onMatchCreated = onMatchCreatedHandler(db);
