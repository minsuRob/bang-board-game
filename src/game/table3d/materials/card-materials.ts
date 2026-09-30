/**
 * 머티리얼 캐시. 카드 (종류·무늬) 당 하나, 뒷면 하나. 조명 없이 MeshBasicMaterial 만 쓴다.
 */

import * as THREE from 'three';

import type { CardKind, CharacterId, EventCardId, Role, Suit } from '../../data/types';
import { cardOf } from '../../engine';
import {
  type ArtCrop,
  cardBackArt,
  characterPortrait,
  eventArt,
  playerBoardArt,
  playingCardArt,
  roleArt,
} from '../../ui/card-art';
import { CARD_SIZE } from '../core/types';
import {
  bulletTexture,
  cardBackTexture,
  cardFaceTexture,
  characterFrameTexture,
  eventCardTexture,
  loadArtTexture,
  playerBoardTexture,
  PORTRAIT_WINDOW,
  roleBackTexture,
  roleFaceTexture,
} from './textures';

const faceMaterials = new Map<string, THREE.MeshBasicMaterial>();

export function faceMaterialFor(card: string): THREE.MeshBasicMaterial {
  const inst = cardOf(card);
  return faceMaterial(inst.kind, inst.suit);
}

export function faceMaterial(kind: CardKind, suit: Suit): THREE.MeshBasicMaterial {
  const key = `${kind}/${suit}`;
  const hit = faceMaterials.get(key);
  if (hit) return hit;
  const mat = new THREE.MeshBasicMaterial({
    map: cardFaceTexture(kind, suit),
    transparent: true,
    side: THREE.FrontSide,
  });
  faceMaterials.set(key, mat);
  // 그림이 설치돼 있으면 뒤늦게 갈아 끼운다. 무늬·숫자는 오버레이가 덮으니 그림만 있으면 된다
  const art = playingCardArt(kind);
  if (art) {
    void loadArtTexture(art).then((tex) => {
      if (!tex) return;
      mat.map = tex;
      mat.needsUpdate = true;
      onMaterialSwapped?.();
    });
  }
  return mat;
}

let backMaterial: THREE.MeshBasicMaterial | null = null;

export function backMaterialShared(): THREE.MeshBasicMaterial {
  if (backMaterial) return backMaterial;
  backMaterial = new THREE.MeshBasicMaterial({ map: cardBackTexture(), transparent: true });
  const art = cardBackArt();
  if (art) {
    void loadArtTexture(art).then((tex) => {
      if (!tex || !backMaterial) return;
      // 양면 복제본도 같이 바꾼다. clone 은 이 시점 이전의 map 을 들고 있다
      for (const m of [backMaterial, backDoubleMaterial]) {
        if (!m) continue;
        m.map = tex;
        m.needsUpdate = true;
      }
      onMaterialSwapped?.();
    });
  }
  return backMaterial;
}

/** 뒷면을 위로 보이게 눕히는 인스턴스용. 양면 */
let backDoubleMaterial: THREE.MeshBasicMaterial | null = null;

export function backMaterialDouble(): THREE.MeshBasicMaterial {
  if (backDoubleMaterial) return backDoubleMaterial;
  const base = backMaterialShared();
  backDoubleMaterial = base.clone();
  backDoubleMaterial.side = THREE.DoubleSide;
  return backDoubleMaterial;
}

/** 그림이 있으면 뒤늦게 map 을 바꿔 끼운다 */
function swapInArt(mat: THREE.MeshBasicMaterial, art: Parameters<typeof loadArtTexture>[0] | null) {
  if (!art) return;
  void loadArtTexture(art).then((tex) => {
    if (!tex) return;
    mat.map = tex;
    mat.needsUpdate = true;
    onMaterialSwapped?.();
  });
}

let boardMat: THREE.MeshBasicMaterial | null = null;

/** 좌석 보드. 모든 좌석이 공유한다 (탈락자 어둡게는 좌석별 color 가 아니라 덮개로) */
export function boardMaterial(): THREE.MeshBasicMaterial {
  if (boardMat) return boardMat;
  boardMat = new THREE.MeshBasicMaterial({ map: playerBoardTexture() });
  swapInArt(boardMat, playerBoardArt());
  return boardMat;
}

let bulletMat: THREE.MeshBasicMaterial | null = null;

export function bulletMaterial(): THREE.MeshBasicMaterial {
  if (bulletMat) return bulletMat;
  bulletMat = new THREE.MeshBasicMaterial({ map: bulletTexture(), transparent: true, depthWrite: false });
  return bulletMat;
}

let roleBackMat: THREE.MeshBasicMaterial | null = null;

/** 역할 카드 뒷면. 원본 뒷면 그림은 없으니 늘 배지 텍스처다 */
export function roleBackMaterial(): THREE.MeshBasicMaterial {
  if (roleBackMat) return roleBackMat;
  roleBackMat = new THREE.MeshBasicMaterial({ map: roleBackTexture(), transparent: true });
  return roleBackMat;
}

const roleFaceMats = new Map<Role, THREE.MeshBasicMaterial>();

export function roleFaceMaterial(role: Role): THREE.MeshBasicMaterial {
  const hit = roleFaceMats.get(role);
  if (hit) return hit;
  const mat = new THREE.MeshBasicMaterial({ map: roleFaceTexture(role), transparent: true });
  roleFaceMats.set(role, mat);
  swapInArt(mat, roleArt(role));
  return mat;
}

let characterFrameMat: THREE.MeshBasicMaterial | null = null;

export function characterFrameMaterial(): THREE.MeshBasicMaterial {
  if (characterFrameMat) return characterFrameMat;
  characterFrameMat = new THREE.MeshBasicMaterial({ map: characterFrameTexture(), transparent: true });
  return characterFrameMat;
}

const portraitMats = new Map<CharacterId, THREE.MeshBasicMaterial>();

/** 캐릭터 초상. 그림이 도착하기 전(또는 없으면)에는 투명이라 틀의 실루엣이 보인다 */
export function portraitMaterial(id: CharacterId): THREE.MeshBasicMaterial {
  const hit = portraitMats.get(id);
  if (hit) return hit;
  const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
  portraitMats.set(id, mat);
  const portrait = characterPortrait(id);
  if (!portrait) return mat;
  void loadArtTexture(portrait.source).then((loaded) => {
    if (!loaded) return;
    // 카드 통째 스캔이면 초상 칸만 창에 맞춰 잘라 붙인다. 캐시된 원본은 건드리지 않게 복제한다
    const tex = portrait.crop ? loaded.clone() : loaded;
    if (portrait.crop) fitCrop(tex, portrait.crop, PORTRAIT_WINDOW_ASPECT);
    mat.map = tex;
    mat.opacity = 1;
    mat.needsUpdate = true;
    onMaterialSwapped?.();
  });
  return mat;
}

/** 초상 창 (가로/세로). 카드 크기에 창 비율을 곱한 것 */
const PORTRAIT_WINDOW_ASPECT = (CARD_SIZE.w * PORTRAIT_WINDOW.w) / (CARD_SIZE.h * PORTRAIT_WINDOW.h);

/** 텍스처의 crop 칸이 aspect 비율 평면을 덮도록 (cover) UV 를 옮긴다 */
function fitCrop(tex: THREE.Texture, crop: ArtCrop, aspect: number) {
  const img = tex.image as { width?: number; height?: number } | undefined;
  const iw = img?.width || 250;
  const ih = img?.height || 389;
  let { x, y, w, h } = crop;
  const cropAspect = (w * iw) / (h * ih);
  if (cropAspect > aspect) {
    const nw = (w * aspect) / cropAspect;
    x += (w - nw) / 2;
    w = nw;
  } else {
    const nh = (h * cropAspect) / aspect;
    y += (h - nh) / 2;
    h = nh;
  }
  // 텍스처 v 는 아래가 0 이다
  tex.repeat.set(w, h);
  tex.offset.set(x, 1 - y - h);
  tex.needsUpdate = true;
}

let eventMaterial: THREE.MeshBasicMaterial | null = null;

export function eventMaterialShared(): THREE.MeshBasicMaterial {
  if (eventMaterial) return eventMaterial;
  eventMaterial = new THREE.MeshBasicMaterial({ map: eventCardTexture(), transparent: true });
  return eventMaterial;
}

const eventMaterials = new Map<EventCardId, THREE.MeshBasicMaterial>();

/** 공개된 이벤트 카드 한 장. 그림이 없으면 자리표시 카드 그대로다 */
export function eventMaterialFor(id: EventCardId): THREE.MeshBasicMaterial {
  const hit = eventMaterials.get(id);
  if (hit) return hit;
  const mat = new THREE.MeshBasicMaterial({ map: eventCardTexture(), transparent: true });
  swapInArt(mat, eventArt(id));
  eventMaterials.set(id, mat);
  return mat;
}

/** 그림이 늦게 도착했을 때 화면을 한 번 더 그리게 하는 훅. Scene 이 invalidate 를 꽂는다 */
let onMaterialSwapped: (() => void) | null = null;
export function setMaterialSwapListener(fn: (() => void) | null) {
  onMaterialSwapped = fn;
}

let cardGeometry: THREE.PlaneGeometry | null = null;

export function cardPlaneGeometry(w: number, h: number): THREE.PlaneGeometry {
  if (!cardGeometry) cardGeometry = new THREE.PlaneGeometry(w, h);
  return cardGeometry;
}
