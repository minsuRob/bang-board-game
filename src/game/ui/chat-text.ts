/**
 * 채팅 화면 문구. 순수 함수라 테스트에서 그대로 돌린다.
 *
 * 말한 사람은 `캐릭터명(직업)` 으로 부른다. 직업은 보낸 때가 아니라 지금 내 시점으로 붙인다.
 * 그래서 누가 탈락하거나 판이 끝나 직업이 드러나면 예전 글의 (???) 도 함께 풀린다.
 */

import type { Role } from '../data/types';
import type { Messages } from '../../i18n/types-messages';
import { namesFor, type Names } from '../../i18n/names';
import { roleVisibleTo, type GameState, type Player, type PlayerId } from '../engine';

export const UNKNOWN_ROLE = '???';

export type ChatSpeaker = {
  /** 캐릭터명. 드래프트 중이면 아직 캐릭터가 없으므로 닉네임 */
  name: string;
  /** 내 시점에서 보이는 직업. 모르면 null */
  role: Role | null;
  /** `캐릭터명(직업)` */
  label: string;
};

/**
 * `state` 는 가리지 않은 상태다. 가린 상태는 모르는 직업을 무법자로 채워 두므로
 * 여기서 직접 roleVisibleTo 로 거른다.
 */
export function chatSpeaker(t: Messages, state: GameState, viewer: PlayerId | null, seat: number, names: Names = namesFor('ko')): ChatSpeaker {
  const p = state.players.find((x) => x.seat === seat);
  if (!p) return { name: t.ui.chat.seatNumber(seat + 1), role: null, label: `${t.ui.chat.seatNumber(seat + 1)}(${UNKNOWN_ROLE})` };

  // 드래프트 중의 character 는 자리표시자(후보 첫 장)다. 남의 후보가 새지 않게 닉네임을 쓴다.
  const name = state.draft ? p.name : names.charName(p.character);
  // 판이 끝나면 결과 화면처럼 모두 드러낸다
  const known = Boolean(state.result) || (viewer === null ? p.roleRevealed : roleVisibleTo(viewer, p));
  const role = known ? p.role : null;
  return { name, role, label: `${name}(${role ? names.roleName(role) : UNKNOWN_ROLE})` };
}

export type ChatMode = 'local' | 'online';

/** 입력창을 잠가야 하면 그 이유. 말할 수 있으면 null */
export function chatBlockReason(t: Messages, opts: {
  mode: ChatMode;
  /** 온라인에서 내가 앉은 자리의 플레이어. 자리 없이 보는 중이면 null */
  me: Player | null;
  /** 방 설정: 탈락한 사람도 말할 수 있는가 */
  deadChat: boolean;
  /** 재갈(와일드 웨스트 쇼)이 걸려 있다 */
  gagged?: boolean;
}): string | null {
  if (opts.mode === 'local') return t.ui.chat.blocked.local;
  if (opts.gagged) return t.ui.chat.blocked.gagged;
  if (!opts.me) return t.ui.chat.blocked.noSeat;
  const out = !opts.me.alive && !opts.me.ghost;
  if (out && !opts.deadChat) return t.ui.chat.blocked.dead;
  return null;
}
