import type { LogMsg } from '../../game/engine/log-msg';
import type { Player, PlayerId } from '../../game/engine/types';
import type { Names } from '../names';
import type { Lang } from '../types';

/** 렌더러가 이름을 찾는 데 쓰는 판의 사람들 */
export type LogPlayer = Pick<Player, 'id' | 'name' | 'character'>;

export type LogCtx = {
  lang: Lang;
  /** 현재 언어의 카드·캐릭터·이벤트·직업 이름 */
  n: Names;
  /** 로그에서 사람을 가리키는 이름 = 그 사람의 캐릭터 이름 (모르면 닉네임) */
  who: (id: PlayerId) => string;
  /** 닉네임 */
  nick: (id: PlayerId) => string;
  players: readonly LogPlayer[];
};

type Of<K extends LogMsg['k']> = Extract<LogMsg, { k: K }>;

/** 로그 한 종류마다 문장 하나. 종류가 빠지면 typecheck 가 실패한다 */
export type LogRenderer = { [K in LogMsg['k']]: (m: Of<K>, c: LogCtx) => string };
