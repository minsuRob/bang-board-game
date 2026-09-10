/**
 * 카드 이미지 조회.
 *
 * 이미지는 저장소에 들어 있지 않다. 카드 일러스트는 dV Giochi 의 저작물이라
 * `assets/cards/` 와 `assets-source/` 를 .gitignore 로 막아 두었다.
 *
 *   node scripts/install-art.mjs
 *
 * 로 설치하면 카드가 원본 그림으로 그려지고, 없으면 도형과 글자로 그린 카드로
 * 되돌아간다. 어느 쪽이든 게임은 똑같이 돌아간다.
 *
 * 파일을 하나하나 require 하지 않고 require.context 로 폴더를 통째로 읽는다.
 * 그래야 이미지가 없을 때도 번들이 깨지지 않는다.
 */

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

/** 카드 그림이 설치되어 있는가. UI 가 두 가지 그리기 방식 중 하나를 고르는 기준이다. */
export const hasCardArt = Object.keys(CARD_ASSETS).length > 0;

export function playingCardArt(kind: CardKind): ImageSourcePropType | null {
  return CARD_ASSETS[`card/${kind}.png`] ?? null;
}

export function characterArt(id: CharacterId): ImageSourcePropType | null {
  return CARD_ASSETS[`character/${id}.png`] ?? null;
}

export function roleArt(role: Role): ImageSourcePropType | null {
  return CARD_ASSETS[`role/${role}.png`] ?? null;
}

export function eventArt(id: EventCardId): ImageSourcePropType | null {
  return CARD_ASSETS[`event/${id}.png`] ?? null;
}

export function cardBackArt(): ImageSourcePropType | null {
  return CARD_ASSETS['back.png'] ?? null;
}

/** 화면 바탕에 까는 나무 판자 */
export function woodArt(): ImageSourcePropType | null {
  return BOARD_ASSETS['wood-table.jpg'] ?? BOARD_ASSETS['wood-tile.jpg'] ?? null;
}

/** 테이블 위에 까는 가죽 */
export function feltArt(): ImageSourcePropType | null {
  return BOARD_ASSETS['felt.jpg'] ?? null;
}

export const hasBoardArt = Object.keys(BOARD_ASSETS).length > 0;
