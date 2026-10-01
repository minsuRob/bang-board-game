/**
 * 3D 테이블의 순수 타입.
 *
 * 이 파일과 core/ 아래는 three·react 를 import 하지 않는다. vitest 에서 그대로 돈다.
 */

import type { CardId } from '../../data/types';
import type { PlayerId } from '../../engine';

export type Vec3 = readonly [number, number, number];

/** 카드 한 장의 3D 크기. 2D CardView 의 78×112 비율(0.696)을 따른다. */
export const CARD_SIZE = { w: 0.7, h: 1.0, thickness: 0.012 } as const;
/** 테이블 가운데 이벤트 카드는 조금 크게 놓는다 */
export const EVENT_CARD_SCALE = 1.05;

/** 좌석 보드 크기. 플레이어 보드 그림(747×531)의 비율을 따른다 */
export const BOARD_SIZE = { w: 2.2, h: 1.56 } as const;

export type SeatAnchor = {
  index: number;
  /** 보드 중심 */
  pos: Vec3;
  /** y축 회전. 카드 윗변(보드의 총알 줄)이 테이블 중심을 향한다 */
  yaw: number;
  /** 중심을 향하는 xz 단위 벡터 */
  inward: Vec3;
  /** 보드 기준 오른쪽 xz 단위 벡터 */
  right: Vec3;
  /** 보드 배율. 내 자리만 크다 */
  scale: number;
  /** 보드 슬롯 중심: 왼쪽 직업, 가운데 캐릭터, 오른쪽 무기 */
  slots: { role: Vec3; character: Vec3; weapon: Vec3 };
  /** 목숨 총알 칸 중심. 왼쪽부터 */
  bullets: Vec3[];
  /** 무기 외 장착 카드 줄의 중심 (보드 윗변 너머) */
  equipment: Vec3;
  /** 상대 손패 부채꼴의 중심 (보드 아랫변 너머) */
  hand: Vec3;
  /** RN 라벨을 붙일 지점 */
  label: Vec3;
};

export type TableLayout = {
  n: number;
  viewerIndex: number;
  portrait: boolean;
  rx: number;
  ry: number;
  seats: SeatAnchor[];
  deck: Vec3;
  discard: Vec3;
  event: Vec3;
  /** 잡화점처럼 가운데 펼치는 카드 자리 */
  store: Vec3[];
  center: Vec3;
  /** 내 손패에서 카드가 출발하는 지점 (화면 아래쪽 바깥) */
  handOrigin: Vec3;
};

export type CameraFrame = { position: Vec3; lookAt: Vec3; fov: number };

export type LimboKind = 'store' | 'judgement' | 'kit' | 'blackJack' | 'poker';

export type Zone =
  | { z: 'deck' }
  | { z: 'discard' }
  | { z: 'hand'; pid: PlayerId }
  | { z: 'equipment'; pid: PlayerId }
  | { z: 'limbo'; kind: LimboKind };

export type CardMove = { card: CardId; from: Zone | null; to: Zone | null };

export type FlightStyle = 'arc' | 'deal' | 'drop' | 'deflect' | 'scatter' | 'reveal';

export type FxCommand =
  | {
      k: 'moveCard';
      card: CardId;
      from: Zone | null;
      to: Zone | null;
      face: 'up' | 'down';
      style: FlightStyle;
      delayMs?: number;
      /** 착지할 때 내리꽂는 연출 */
      slam?: boolean;
      /** reveal 스타일이 가운데서 머무는 시간 */
      holdMs?: number;
      /** 이 좌석 위에서 한 번 머물렀다가 목적지로 떨어진다 (지목 카드) */
      via?: PlayerId;
      /** 출발·도착 존 안에서의 순번과 장수 */
      fromIndex: number;
      fromCount: number;
      toIndex: number;
      toCount: number;
    }
  | { k: 'bang'; from: PlayerId; to: PlayerId }
  | { k: 'fanOut'; from: PlayerId; to: PlayerId[]; staggerMs: number }
  | { k: 'shield'; pid: PlayerId }
  | { k: 'seatFlash'; pid: PlayerId; tone: 'red' | 'green' | 'gold' }
  | { k: 'particles'; preset: 'sparkle' | 'dust' | 'explosion'; pid?: PlayerId }
  | { k: 'shockwave'; pid?: PlayerId; strength: number }
  | { k: 'cameraFocus'; pid?: PlayerId; holdMs: number }
  | { k: 'cameraKick'; toward: PlayerId; strength: number }
  | { k: 'shake'; strength: number; ms: number }
  | { k: 'number'; pid: PlayerId; text: string; tone: 'damage' | 'heal' | 'info' }
  | { k: 'caption'; text: string; ms: number }
  | { k: 'wait'; ms: number };

export type FxBatch = {
  seq: number;
  /** 순서대로 실행되는 단계. 한 단계 안의 명령은 동시에 돈다 */
  steps: FxCommand[][];
  estMs: number;
  /** 애니메이션 없이 정답 위치로 바로 놓는다 */
  snap?: boolean;
  /** 밀린 배치. 빠르게 넘긴다 */
  fast?: boolean;
};

export type DeviceTier = 'low' | 'high';

export type FxBudget = {
  tier: DeviceTier;
  particles: number;
  antialias: boolean;
  contactShadow: boolean;
};
