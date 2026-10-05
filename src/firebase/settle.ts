/**
 * 온라인 방 정산 요청. 판이 끝나면 자리에 앉은 사람 아무나 부른다 (서버가 멱등하게 처리한다).
 */

import { httpsCallable } from 'firebase/functions';

import type { RoomSettlement } from '../game/economy/model';
import { getFunctionsClient } from './config';

export async function settleRoom(code: string): Promise<RoomSettlement> {
  const fn = httpsCallable<{ code: string }, RoomSettlement>(getFunctionsClient(), 'settleRoom');
  const res = await fn({ code: code.toUpperCase() });
  return res.data;
}
