import type { AbilityKey, CardKind, CharacterId, EventCardId, Expansion, GoldCardKind, Role } from '../game/data/types';
import type { RejectReason } from '../game/economy/model';
import type { GameResult, JudgementPurpose } from '../game/engine/types';
import type { AiTier } from '../game/ai/types';
import { en } from './content/en';
import { it } from './content/it';
import { ko } from './content/ko';
import type { Content } from './content/types';
import type { Lang } from './types';

/**
 * 게임 내용의 이름·설명을 현재 언어로 찾는 도우미. React 를 쓰지 않아 테스트·스크립트에서도 쓴다.
 * 컴포넌트에서는 `useNames()` (use-names.ts) 가 현재 언어의 이 객체를 돌려준다.
 */

const CONTENT: Record<Lang, Content> = { ko, en, it };

export function contentFor(lang: Lang): Content {
  return CONTENT[lang];
}

export type Names = ReturnType<typeof namesFor>;

/** 키를 모르면(저장 파일에 남은 옛 id 등) 키 자체를 보인다 */
function pick<T extends { name: string }>(table: Record<string, T>, key: string): T {
  return table[key] ?? ({ name: key, text: '' } as unknown as T);
}

export function namesFor(lang: Lang) {
  const c = CONTENT[lang];
  return {
    lang,
    content: c,
    cardName: (kind: CardKind) => pick(c.cards, kind).name,
    cardText: (kind: CardKind) => pick(c.cards, kind).text,
    charName: (id: CharacterId) => pick(c.characters, id).name,
    /** 캐릭터 능력 설명 */
    charAbility: (id: CharacterId) => pick(c.characters, id).text,
    eventName: (id: EventCardId) => pick(c.events, id).name,
    eventText: (id: EventCardId) => pick(c.events, id).text,
    goldName: (kind: GoldCardKind) => pick(c.gold, kind).name,
    goldText: (kind: GoldCardKind) => pick(c.gold, kind).text,
    roleName: (role: Role) => c.roles[role]?.name ?? role,
    roleGoal: (role: Role) => c.roles[role]?.goal ?? '',
    expansionName: (x: Expansion) => c.expansions[x] ?? x,
    /** Modifier 능력 id → 버튼·로그 문구 */
    abilityLabel: (key: AbilityKey | string) => c.abilities[key as AbilityKey] ?? key,
    judgementName: (p: JudgementPurpose) => c.judgement[p] ?? p,
    /** 게임이 끝난 까닭. lastStanding 은 마지막 생존자 이름이 필요해서 players 를 받는다 */
    resultReason: (result: Pick<GameResult, 'reason' | 'winnerIds'>, players: readonly { id: string; name: string }[]) => {
      if (result.reason === 'lastStanding') {
        const id = result.winnerIds[0];
        return c.resultReason.lastStanding(players.find((p) => p.id === id)?.name ?? id ?? '');
      }
      return c.resultReason[result.reason];
    },
    rejectReason: (r: RejectReason) => c.rejectReason[r] ?? r,
    aiTier: (t: AiTier) => c.aiTier[t],
    aiSpeed: (speed: number) => c.aiSpeed(speed),
  };
}
