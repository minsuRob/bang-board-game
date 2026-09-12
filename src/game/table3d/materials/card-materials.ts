/**
 * 머티리얼 캐시. 카드 (종류·무늬) 당 하나, 뒷면 하나. 조명 없이 MeshBasicMaterial 만 쓴다.
 */

import * as THREE from 'three';

import type { CardKind, Suit } from '../../data/types';
import { cardOf } from '../../engine';
import { playingCardArt, cardBackArt } from '../../ui/card-art';
import { cardBackTexture, cardFaceTexture, eventCardTexture, loadArtTexture } from './textures';

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
      backMaterial.map = tex;
      backMaterial.needsUpdate = true;
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

let eventMaterial: THREE.MeshBasicMaterial | null = null;

export function eventMaterialShared(): THREE.MeshBasicMaterial {
  if (eventMaterial) return eventMaterial;
  eventMaterial = new THREE.MeshBasicMaterial({ map: eventCardTexture(), transparent: true });
  return eventMaterial;
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
