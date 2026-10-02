/**
 * 카드 이미지 조회.
 *
 * 그림은 `assets/cards/`, `assets/board/` 에 커밋돼 있다 (docs/assets.md).
 * 그림이 있으면 원본 그림으로, 없으면 도형과 글자로 그린 카드로 그린다.
 * 어느 쪽이든 게임은 똑같이 돌아간다.
 *
 * 파일을 하나하나 require 하지 않고 require.context 로 폴더를 통째로 읽는다.
 * 그래야 이미지가 없을 때도 번들이 깨지지 않는다.
 */

import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';

import type { CardKind, CharacterId, EventCardId, Role } from '../data/types';

type AssetMap = Record<string, ImageSourcePropType>;

function loadFolder(): AssetMap {
  const out: AssetMap = {};
  try {
    // require.context 는 Metro 가 번들 시점에 정적으로 펼친다
    const ctx = require.context('../../../assets/cards', true, /\.(png|jpg|jpeg|webp)$/);
    for (const key of ctx.keys() as string[]) {
      out[key.replace(/^\.\//, '')] = ctx(key) as ImageSourcePropType;
    }
  } catch {
    // 폴더가 비어 있거나 require.context 를 못 쓰는 환경이면 그림 없이 간다.
  }
  return out;
}

function loadBoard(): AssetMap {
  const out: AssetMap = {};
  try {
    const ctx = require.context('../../../assets/board', false, /\.(png|jpg|jpeg|webp)$/);
    for (const key of ctx.keys() as string[]) {
      out[key.replace(/^\.\//, '')] = ctx(key) as ImageSourcePropType;
    }
  } catch {
    /* 배경 없이 간다 */
  }
  return out;
}

const CARD_ASSETS = loadFolder();
const BOARD_ASSETS = loadBoard();

/**
 * 미리 받아 둔 그림. 키 → 메모리에 붙잡아 둔 소스 (웹의 blob URL).
 * Metro 개발 서버는 에셋을 no-store 로 내보내서, 원래 주소를 쓰면 <img> 가 뜰 때마다
 * 다시 받는다. 받아 둔 게 있으면 모든 조회가 이쪽을 먼저 돌려준다. art-preload.ts 가 채운다.
 */
const RESOLVED: AssetMap = {};

export function setResolvedArt(key: string, source: ImageSourcePropType) {
  RESOLVED[key] = source;
}

function card(key: string): ImageSourcePropType | null {
  return RESOLVED[key] ?? CARD_ASSETS[key] ?? null;
}

function board(...names: string[]): ImageSourcePropType | null {
  for (const name of names) {
    const hit = RESOLVED[`board/${name}`] ?? BOARD_ASSETS[name];
    if (hit) return hit;
  }
  return null;
}

/** 카드 그림이 설치되어 있는가. UI 가 두 가지 그리기 방식 중 하나를 고르는 기준이다. */
export const hasCardArt = Object.keys(CARD_ASSETS).length > 0;

export function playingCardArt(kind: CardKind): ImageSourcePropType | null {
  return card(`card/${kind}.png`);
}

export function characterArt(id: CharacterId): ImageSourcePropType | null {
  return card(`character/${id}.png`);
}

/** 그림 안의 한 칸. 0~1 비율, 왼쪽 위 원점 */
export type ArtCrop = { x: number; y: number; w: number; h: number };

/**
 * 제작사 캐릭터 카드 스캔(250×389)에서 초상 그림만 있는 칸.
 * 위의 영문 이름, 오른쪽 목숨 총알, 아래 이탈리아어·영어 능력 문구를 뺀다.
 */
const SCAN_PORTRAIT: ArtCrop = { x: 32 / 250, y: 64 / 389, w: 166 / 250, h: 176 / 389 };

export type CharacterPortrait = {
  source: ImageSourcePropType;
  /** 원본 픽셀 크기. 모르면 null */
  size: { width: number; height: number } | null;
  /** 잘라 쓸 칸. 이미 초상만 있는 그림이면 null */
  crop: ArtCrop | null;
};

/**
 * 캐릭터 초상. 카드 한 장 통째 스캔(세로로 긴 0.64 비율)이면 그림 칸만 잘라 쓰고,
 * 초상만 따로 잘라 둔 그림이면 그대로 쓴다.
 */
export function characterPortrait(id: CharacterId): CharacterPortrait | null {
  const source = characterArt(id);
  const original = CARD_ASSETS[`character/${id}.png`];
  if (!source || !original) return null;
  const size = assetSize(original);
  const fullScan = size ? size.width / size.height < 0.7 : true;
  return { source, size, crop: fullScan ? SCAN_PORTRAIT : null };
}

/** 설치된 그림 전부 (번들 원본). 키는 `card/bang.png`, `back.png`, `board/felt.jpg` 꼴이다 */
export function allArt(): { key: string; source: ImageSourcePropType }[] {
  return [
    ...Object.entries(CARD_ASSETS).map(([key, source]) => ({ key, source })),
    ...Object.entries(BOARD_ASSETS).map(([key, source]) => ({ key: `board/${key}`, source })),
  ];
}

/** 번들 에셋의 픽셀 크기. Metro 가 등록해 둔 메타데이터를 읽는다 */
function assetSize(source: ImageSourcePropType): { width: number; height: number } | null {
  try {
    const asset = Asset.fromModule(source as number);
    if (asset.width && asset.height) return { width: asset.width, height: asset.height };
  } catch {
    /* 모르면 호출자가 기본값을 쓴다 */
  }
  return null;
}

export function roleArt(role: Role): ImageSourcePropType | null {
  return card(`role/${role}.png`);
}

export function eventArt(id: EventCardId): ImageSourcePropType | null {
  return card(`event/${id}.png`);
}

export function cardBackArt(): ImageSourcePropType | null {
  return card('back.png');
}

/** 화면 바탕에 까는 나무 판자 */
export function woodArt(): ImageSourcePropType | null {
  return board('wood-table.jpg', 'wood-tile.jpg');
}

/** 테이블 위에 까는 가죽 */
export function feltArt(): ImageSourcePropType | null {
  return board('felt.jpg');
}

/** 좌석마다 까는 플레이어 보드 (총알 5칸 · 직업/캐릭터/무기 슬롯) */
export function playerBoardArt(): ImageSourcePropType | null {
  return board('player-board.webp', 'player-board.jpg', 'player-board.png');
}

export const hasBoardArt = Object.keys(BOARD_ASSETS).length > 0;
