/**
 * 카드를 냈을 때 가운데 스포트라이트에 얹는 연출 표.
 *
 * 카드 종류 하나에 한 줄. 새 카드에 연출을 붙이려면 여기 한 줄을 더하고,
 * 새 모양이 필요하면 `visual` 종류와 그 오버레이 컴포넌트를 늘린다.
 */

import type { CardKind } from '../../data/types';
import { isHidden, kindOf, type GameEvent } from '../../engine';
import type { SfxId } from '../sfx';

export type CardFx =
  | {
      visual: 'gunshot';
      sfx: SfxId;
      /** 그림 속 총구 자리. 카드 폭·높이에 대한 비율 */
      muzzle: { x: number; y: number };
    }
  | {
      /** 슬로모션 스침. 고화질에서만 (일반 연출은 아직 없다) */
      visual: 'missed';
      sfx: SfxId;
      /** 확대할 때 붙잡아 둘 얼굴 자리. 원본 그림(250×389)에 대한 비율 */
      focus: { x: number; y: number };
    };

export const CARD_FX: Partial<Record<CardKind, CardFx>> = {
  // 뱅! 그림의 권총은 오른쪽을 겨눈다
  bang: { visual: 'gunshot', sfx: 'gunshot', muzzle: { x: 0.84, y: 0.36 } },
  // 빗나감! 그림은 총알이 머리 옆을 스쳐 모자를 날린 장면이다
  missed: { visual: 'missed', sfx: 'bullet_whiz', focus: { x: 118 / 250, y: 165 / 389 } },
};

/** 결투·인디언에 뱅!으로 응수한 로그. 카드 종류와 무관하게 뱅!을 쏜 것이다 */
const BANG_RESPONSES = new Set(['duelBang', 'indiansBang']);

export function cardFxFor(event: GameEvent): CardFx | null {
  if (!event.card || isHidden(event.card)) return null;
  if (BANG_RESPONSES.has(event.t)) return CARD_FX.bang ?? null;
  // 뱅!을 빗나감!으로 받았다 (캘러미티 자넷이 뱅!으로 받아도 빗나감이다)
  if (event.t === 'playMissed') return CARD_FX.missed ?? null;
  if (event.t !== 'playCard') return null;
  return CARD_FX[kindOf(event.card)] ?? null;
}
