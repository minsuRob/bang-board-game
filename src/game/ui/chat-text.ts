/**
 * 채팅 화면 문구. 순수 함수라 테스트에서 그대로 돌린다.
 *
 * 말한 사람은 `캐릭터명(직업)` 으로 부른다. 직업은 보낸 때가 아니라 지금 내 시점으로 붙인다.
 * 그래서 누가 탈락하거나 판이 끝나 직업이 드러나면 예전 글의 (???) 도 함께 풀린다.
 */

import { CHARACTERS } from '../data/characters';
import { ROLE_LABEL } from '../data/roles';
import type { Role } from '../data/types';
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
export function chatSpeaker(state: GameState, viewer: PlayerId | null, seat: number): ChatSpeaker {
  const p = state.players.find((x) => x.seat === seat);
  if (!p) return { name: `${seat + 1}번 자리`, role: null, label: `${seat + 1}번 자리(${UNKNOWN_ROLE})` };

  // 드래프트 중의 character 는 자리표시자(후보 첫 장)다. 남의 후보가 새지 않게 닉네임을 쓴다.
  const name = state.draft ? p.name : CHARACTERS[p.character].nameKo;
  // 판이 끝나면 결과 화면처럼 모두 드러낸다
  const known = Boolean(state.result) || (viewer === null ? p.roleRevealed : roleVisibleTo(viewer, p));
  const role = known ? p.role : null;
  return { name, role, label: `${name}(${role ? ROLE_LABEL[role] : UNKNOWN_ROLE})` };
}

export type ChatMode = 'local' | 'online';

/** 입력창을 잠가야 하면 그 이유. 말할 수 있으면 null */
export function chatBlockReason(opts: {
  mode: ChatMode;
  /** 온라인에서 내가 앉은 자리의 플레이어. 자리 없이 보는 중이면 null */
  me: Player | null;
  /** 방 설정: 탈락한 사람도 말할 수 있는가 */
  deadChat: boolean;
}): string | null {
  if (opts.mode === 'local') return '채팅은 온라인 판에서만 쓸 수 있다';
  if (!opts.me) return '자리에 앉은 사람만 말할 수 있다';
  const out = !opts.me.alive && !opts.me.ghost;
  if (out && !opts.deadChat) return '탈락한 뒤에는 읽기만 할 수 있다';
  return null;
}
