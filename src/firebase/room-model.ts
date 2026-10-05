/**
 * 방 데이터 모양과 순수 규칙.
 *
 * Firebase 도 React Native 도 import 하지 않는다. 그래야 테스트에서 그대로 돌릴 수 있고,
 * 나중에 서버(Cloud Functions)로 옮겨도 같은 코드를 쓴다.
 */

import type { AiSpeed, AiTier } from '../game/ai/types';
import { isEventExpansion } from '../game/data/events';
import type { EventExpansion } from '../game/data/types';
import type { RoomSettlement } from '../game/economy/model';

/** 이 시간 안에 소식이 없으면 나간 것으로 본다 */
export const PRESENCE_TIMEOUT_MS = 30_000;

/**
 * 자리 비움으로 알린 사람은 이만큼 더 기다린다.
 * 탭을 오래 숨겨 두면 브라우저가 타이머를 1분 간격까지 늦춰 생존 신호가 드문드문 온다.
 */
export const AWAY_TIMEOUT_MS = 90_000;

/**
 * 접속 상태. 화면에서 초록(active)·노랑(away)·빨강(left) 점으로 보인다.
 *   active  판을 보고 있다
 *   away    탭을 숨겼거나 앱을 내렸거나, 한동안 아무 입력이 없다
 *   left    나갔다고 알렸거나, 소식이 끊겼다
 */
export type Presence = 'active' | 'away' | 'left';

export type RoomSeat = {
  /** 사람이 앉아 있으면 uid, 비어 있으면 null */
  uid: string | null;
  nick: string;
  /** 게임이 시작될 때 AI 가 맡은 자리인가 */
  ai: boolean;
};

export type RoomDoc = {
  code: string;
  hostUid: string;
  status: 'lobby' | 'playing' | 'ended';
  playerCount: number;
  /** 상황 카드 확장판 하나. null 이면 끈다. 이 필드가 생기기 전에 만든 방에는 없다 */
  eventExpansion?: EventExpansion | null;
  /** 예전 방의 하이 눈 켜기. eventExpansion 이 없을 때만 본다 (roomEventExpansion) */
  highnoon?: boolean;
  /** 예전 방의 와일드 웨스트 쇼 켜기. eventExpansion 이 없을 때만 본다 */
  wildwestshow?: boolean;
  /** 그림자의 계곡. 이 필드가 생기기 전에 만든 방에는 없다 */
  valley?: boolean;
  tier: AiTier;
  seats: RoomSeat[];
  seed: number;
  actionCount: number;
  /** 판 도중 방장이 고른 AI 빠르기. 예전 방에는 없다 (1배) */
  aiSpeed?: AiSpeed;
  /** 탈락한 사람도 채팅할 수 있는가. 예전 방에는 없다 (허용) */
  deadChat?: boolean;
  /** 보상 정산. 판이 끝나고 Cloud Functions 가 한 번 쓴다 (docs/economy.md) */
  settlement?: RoomSettlement;
};

export type RoomMember = {
  nick: string;
  /** 마지막으로 살아 있다고 알린 시각 (ms) */
  lastSeen: number;
  /** 스스로 알린 접속 상태. 예전 문서에는 없다 (active) */
  presence?: Presence;
  /** 캐릭터 드래프트에서 마우스를 올려 둔 후보 인덱스 (화면 연출용) */
  draftHover?: number | null;
};

/**
 * 남이 보는 접속 상태. 스스로 알린 값을 믿되, 소식이 끊긴 지 오래면 나간 것으로 본다.
 * 탭을 닫으면서 보낸 '나감' 은 닿지 못할 수 있다. 그때는 시간이 대신 알려 준다.
 */
/** 이 방의 상황 카드 확장판. 예전 방은 highnoon · wildwestshow 켜기 값에서 읽는다 */
export function roomEventExpansion(
  room: Pick<RoomDoc, 'eventExpansion' | 'highnoon' | 'wildwestshow'>,
): EventExpansion | null {
  if (room.eventExpansion !== undefined) {
    return isEventExpansion(room.eventExpansion) ? room.eventExpansion : null;
  }
  if (room.highnoon) return 'highnoon';
  if (room.wildwestshow) return 'wildwestshow';
  return null;
}

export function presenceOf(member: RoomMember | undefined, now = Date.now()): Presence {
  if (!member || member.presence === 'left') return 'left';
  const away = member.presence === 'away';
  if (now - member.lastSeen >= (away ? AWAY_TIMEOUT_MS : PRESENCE_TIMEOUT_MS)) return 'left';
  return away ? 'away' : 'active';
}

/** 좌석 순서의 uid 목록을 좌석 id(`p0`, `p1` …)별 접속 상태로 바꾼다. 빈 자리·AI 자리는 뺀다 */
export function seatPresence(
  uids: (string | null)[],
  members: Record<string, RoomMember>,
  now = Date.now(),
): Record<string, Presence> {
  const out: Record<string, Presence> = {};
  uids.forEach((uid, i) => {
    if (uid) out[`p${i}`] = presenceOf(members[uid], now);
  });
  return out;
}

/**
 * 지금 AI 자리와 제한시간을 굴려야 하는 사람.
 *
 * 살아 있는 참가자 중 좌석 번호가 가장 작은 사람 하나만 굴린다.
 * 여럿이 굴리면 같은 액션이 두 번 들어간다.
 * 그 사람이 끊기면 다음 사람이 자동으로 이어받는다. 따로 합의할 것이 없다.
 */
export function pickDriver(
  room: RoomDoc,
  members: Record<string, RoomMember>,
  now = Date.now(),
): string | null {
  for (const seat of room.seats) {
    if (!seat.uid) continue;
    const member = members[seat.uid];
    // 나간다고 알린 사람은 시간이 남아 있어도 넘긴다. 기다리는 동안 AI 가 멈춘다
    if (member && member.presence !== 'left' && now - member.lastSeen < PRESENCE_TIMEOUT_MS) {
      return seat.uid;
    }
  }
  return null;
}
