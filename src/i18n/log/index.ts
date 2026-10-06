import type { GameEvent } from '../../game/engine/types';
import { namesFor } from '../names';
import type { Lang } from '../types';
import { enLog } from './en';
import { itLog } from './it';
import { koLog } from './ko';
import type { LogCtx, LogPlayer, LogRenderer } from './types';

export type { LogCtx, LogPlayer, LogRenderer } from './types';

const RENDERERS: Record<Lang, LogRenderer> = { ko: koLog, en: enLog, it: itLog };

export function logCtx(lang: Lang, players: readonly LogPlayer[]): LogCtx {
  const n = namesFor(lang);
  const byId = new Map(players.map((p) => [p.id, p]));
  const nick = (id: string) => byId.get(id)?.name ?? id;
  return {
    lang,
    n,
    players,
    nick,
    who: (id) => {
      const p = byId.get(id);
      return p ? n.charName(p.character) : id;
    },
  };
}

/**
 * 로그 한 줄을 현재 언어 문장으로 만든다. 옛 저장 파일의 한국어 문장(legacyText)은 그대로 낸다.
 * players 는 이름을 찾을 판의 사람들 (보통 보고 있는 판의 state.players)
 */
export function renderLog(e: GameEvent, lang: Lang, players: readonly LogPlayer[] | LogCtx): string {
  if (e.legacyText !== undefined) return e.legacyText;
  const ctx = 'n' in players ? players : logCtx(lang, players);
  const render = RENDERERS[lang][e.msg.k] as (m: GameEvent['msg'], c: LogCtx) => string;
  return render(e.msg, ctx);
}
