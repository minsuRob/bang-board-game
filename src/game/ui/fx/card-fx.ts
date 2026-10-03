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
    }
  | {
      /** 볼캐닉: 그림 속 총구에서 7연사. 고화질에서만 */
      visual: 'volley';
      /** 원본 그림(250×389) 픽셀 좌표. 총구와, 총이 놓인 방향을 잴 뒤쪽 점 */
      muzzle: { x: number; y: number };
      back: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 스코필드: 큰 실린더가 돌며 장전된 뒤 그림 속 실린더로 들어간다. 고화질에서만 */
      visual: 'cylinder';
      /** 그림 속 실린더 가운데와 반지름 (원본 픽셀) */
      hub: { x: number; y: number };
      hubR: number;
      cues: SfxCue[];
    }
  | {
      /** 레밍턴: 오른쪽 사격장 과녁 3개를 맞힌다. 고화질에서만 */
      visual: 'range';
      muzzle: { x: number; y: number };
      back: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 카빈: 카드가 뒤로 기대고 원근 레인 4칸에 불이 든다. 고화질에서만 */
      visual: 'lane';
      cues: SfxCue[];
    }
  | {
      /** 윈체스터: 총구에서 야간 녹색 조준경이 커지고 눈금 1~5. 고화질에서만 */
      visual: 'nightScope';
      muzzle: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 조준경: 그림 속 대물렌즈에서 둥근 시야가 열려 먼 사람이 당겨진다. 고화질에서만 */
      visual: 'scope';
      /** 대물렌즈 (원본 픽셀) */
      lens: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 야생마: 카드가 원근 길을 따라 멀어졌다 돌아온다. 고화질에서만 */
      visual: 'mustang';
      cues: SfxCue[];
    }
  | {
      /** 술통: 사내가 통 뒤로 쏙 숨고 총알이 통에 맞아 핑 튕긴다. 고화질에서만 */
      visual: 'barrel';
      /** 총알이 맞는 통 옆구리 (원본 픽셀) */
      hit: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 기관총: 그림 속 총구에서 연사가 모든 자리를 쓸어 간다. 고화질에서만 */
      visual: 'gatling';
      muzzle: { x: number; y: number };
      /** 탄피가 튀는 총 몸통 */
      eject: { x: number; y: number };
      cues: SfxCue[];
    }
  | {
      /** 인디언!: 그림 속 외치는 입에서 함성 고리가 판 전체로 번진다. 고화질에서만 */
      visual: 'indians';
      mouth: { x: number; y: number };
      /** 깃털이 흩날리는 자리 */
      feather: { x: number; y: number };
      cues: SfxCue[];
    };

/** 연출 시작에서 몇 ms 뒤에 어떤 소리. AI 배속만큼 함께 당긴다 */
export type SfxCue = { at: number; sfx: SfxId };

const times = (list: readonly number[], sfx: SfxId): SfxCue[] => list.map((at) => ({ at, sfx }));

export const CARD_FX: Partial<Record<CardKind, CardFx>> = {
  // 뱅! 그림의 권총은 오른쪽을 겨눈다
  bang: { visual: 'gunshot', sfx: 'gunshot', muzzle: { x: 0.84, y: 0.36 } },
  // 빗나감! 그림은 총알이 머리 옆을 스쳐 모자를 날린 장면이다
  missed: { visual: 'missed', sfx: 'bullet_whiz', focus: { x: 118 / 250, y: 165 / 389 } },
  // 총 장착. 시간은 timeline.ts 의 시간표와 맞춘다
  volcanic: {
    visual: 'volley',
    muzzle: { x: 195, y: 117 },
    back: { x: 112, y: 165 },
    cues: times([120, 255, 375, 480, 570, 660, 750], 'rapid_shot'),
  },
  schofield: {
    visual: 'cylinder',
    hub: { x: 108, y: 160 },
    hubR: 21,
    cues: [{ at: 0, sfx: 'gun_latch' }, ...times([340, 459, 578, 697, 816, 935], 'cylinder_click'), { at: 1564, sfx: 'gun_latch' }],
  },
  remington: {
    visual: 'range',
    muzzle: { x: 206, y: 116 },
    back: { x: 118, y: 178 },
    cues: [...times([580, 860, 1140], 'rapid_shot'), ...times([680, 960, 1240], 'target_ding')],
  },
  carabine: {
    visual: 'lane',
    cues: [{ at: 0, sfx: 'gun_latch' }, ...times([360, 540, 720, 900], 'cylinder_click')],
  },
  winchester: {
    visual: 'nightScope',
    muzzle: { x: 46, y: 94 },
    cues: [{ at: 0, sfx: 'gun_latch' }, ...times([580, 680, 780, 880, 980, 1160], 'cylinder_click')],
  },
  // 렌즈 돌리는 끼릭 두 번, 먼 사람이 당겨져 거리가 줄 때 맑은 팅
  scope: {
    visual: 'scope',
    lens: { x: 140, y: 172 },
    cues: [...times([300, 560], 'cylinder_click'), { at: 1040, sfx: 'target_ding' }],
  },
  // 다그닥 (멀어질 때 두 번, 돌아올 때 한 번), 착지 털썩
  mustang: {
    visual: 'mustang',
    cues: [...times([100, 500, 1160], 'hoof_gallop'), { at: 1720, sfx: 'wood_thud' }],
  },
  // 쏙 숨고, 통에 퉁 + 핑 튕김, 하트에 딩
  barrel: {
    visual: 'barrel',
    hit: { x: 158, y: 186 },
    cues: [
      { at: 90, sfx: 'card_draw' },
      { at: 750, sfx: 'wood_thud' },
      { at: 760, sfx: 'ricochet' },
      { at: 930, sfx: 'target_ding' },
    ],
  },
  // 연사 15발 뒤 크랭크가 헛도는 딸깍 두 번
  gatling: {
    visual: 'gatling',
    muzzle: { x: 208, y: 199 },
    eject: { x: 172, y: 192 },
    cues: [...times(Array.from({ length: 15 }, (_, i) => 144 + i * 77), 'rapid_shot'), ...times([1360, 1440], 'cylinder_click')],
  },
  // 함성 박자마다 둥
  indians: {
    visual: 'indians',
    mouth: { x: 133, y: 234 },
    feather: { x: 143, y: 102 },
    cues: times([108, 504, 900], 'war_drum'),
  },
};

/** 결투·인디언에 뱅!으로 응수한 로그. 카드 종류와 무관하게 뱅!을 쏜 것이다 */
const BANG_RESPONSES = new Set(['duelBang', 'indiansBang']);

export function cardFxFor(event: GameEvent): CardFx | null {
  if (!event.card || isHidden(event.card)) return null;
  if (BANG_RESPONSES.has(event.t)) return CARD_FX.bang ?? null;
  // 뱅!을 빗나감!으로 받았다 (캘러미티 자넷이 뱅!으로 받아도 빗나감이다)
  if (event.t === 'playMissed') return CARD_FX.missed ?? null;
  if (event.t !== 'playCard') return null;
  return CARD_FX[event.as ?? kindOf(event.card)] ?? null;
}
