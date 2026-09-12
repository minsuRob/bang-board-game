/**
 * 픽셀로 직접 찍는 텍스처.
 *
 * 네이티브에는 DOM canvas 가 없어 글자를 텍스처로 구울 수 없다. 그래서 카드 면은
 * 종이색·테두리색·무늬·종류별 문장(紋章)만으로 만든다. 글자는 RN 오버레이가 맡는다.
 * 원본 그림이 설치돼 있으면 loadArtTexture 로 바꿔 끼운다.
 */

import { Asset } from 'expo-asset';
import type { ImageSourcePropType } from 'react-native';
import * as THREE from 'three';

import { CARD_DEFS } from '../../data/cards.base';
import type { CardKind, Suit } from '../../data/types';
import { Colors } from '@/constants/theme';
import { insideStar, insideSuit } from './suit-sdf';

export const FACE_W = 128;
export const FACE_H = 184;

type RGBA = readonly [number, number, number, number];

function hex(color: string, alpha = 255): RGBA {
  const v = parseInt(color.slice(1), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255, alpha];
}

class Painter {
  readonly data: Uint8Array;
  constructor(
    readonly w: number,
    readonly h: number,
  ) {
    this.data = new Uint8Array(w * h * 4);
  }

  /** y 는 위가 0. DataTexture 는 아래가 0 이라 뒤집어 쓴다 */
  put(x: number, y: number, c: RGBA) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = ((this.h - 1 - y) * this.w + x) * 4;
    const a = c[3] / 255;
    const d = this.data;
    d[i] = d[i] * (1 - a) + c[0] * a;
    d[i + 1] = d[i + 1] * (1 - a) + c[1] * a;
    d[i + 2] = d[i + 2] * (1 - a) + c[2] * a;
    d[i + 3] = Math.max(d[i + 3], c[3]);
  }

  each(fn: (x: number, y: number) => RGBA | null) {
    for (let y = 0; y < this.h; y++)
      for (let x = 0; x < this.w; x++) {
        const c = fn(x, y);
        if (c) this.put(x, y, c);
      }
  }

  toTexture(): THREE.DataTexture {
    const tex = new THREE.DataTexture(this.data, this.w, this.h, THREE.RGBAFormat);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.magFilter = THREE.LinearFilter;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.generateMipmaps = true;
    tex.needsUpdate = true;
    return tex;
  }
}

/** 둥근 사각형 안인가. inset 만큼 안쪽으로 줄여서 판정 */
function insideRoundRect(x: number, y: number, w: number, h: number, r: number, inset: number): boolean {
  const l = inset;
  const t = inset;
  const rr = Math.max(0, r - inset);
  const cx = Math.max(l + rr, Math.min(x, w - 1 - inset - rr));
  const cy = Math.max(t + rr, Math.min(y, h - 1 - inset - rr));
  if (x < l || y < t || x > w - 1 - inset || y > h - 1 - inset) return false;
  return (x - cx) ** 2 + (y - cy) ** 2 <= rr * rr;
}

// ---------------------------------------------------------------------------
// 카드 면
// ---------------------------------------------------------------------------

type Emblem = 'bullet' | 'twoBullets' | 'ring' | 'plus' | 'card' | 'bar' | 'bars' | 'blast';

const EMBLEM: Record<CardKind, Emblem> = {
  bang: 'bullet',
  gatling: 'bullet',
  indians: 'bullet',
  duel: 'twoBullets',
  missed: 'ring',
  barrel: 'ring',
  scope: 'ring',
  mustang: 'ring',
  beer: 'plus',
  saloon: 'plus',
  stagecoach: 'card',
  wellsFargo: 'card',
  generalStore: 'card',
  panic: 'card',
  catBalou: 'card',
  volcanic: 'bar',
  schofield: 'bar',
  remington: 'bar',
  carabine: 'bar',
  winchester: 'bar',
  jail: 'bars',
  dynamite: 'blast',
};

function insideEmblem(e: Emblem, x: number, y: number): boolean {
  const r = Math.hypot(x, y);
  switch (e) {
    case 'bullet':
      return r < 0.55;
    case 'twoBullets':
      return Math.hypot(x + 0.45, y) < 0.36 || Math.hypot(x - 0.45, y) < 0.36;
    case 'ring':
      return r < 0.62 && r > 0.4;
    case 'plus':
      return (Math.abs(x) < 0.2 && Math.abs(y) < 0.65) || (Math.abs(y) < 0.2 && Math.abs(x) < 0.65);
    case 'card':
      return Math.abs(x) < 0.4 && Math.abs(y) < 0.58 && !(Math.abs(x) < 0.28 && Math.abs(y) < 0.46);
    case 'bar':
      return Math.abs(y) < 0.14 && Math.abs(x) < 0.7;
    case 'bars':
      return Math.abs(y) < 0.65 && (Math.abs(x - 0.45) < 0.08 || Math.abs(x) < 0.08 || Math.abs(x + 0.45) < 0.08);
    case 'blast':
      return r < 0.35 + 0.22 * Math.abs(Math.sin(Math.atan2(y, x) * 5));
  }
}

const faceCache = new Map<string, THREE.DataTexture>();

export function cardFaceTexture(kind: CardKind, suit: Suit): THREE.DataTexture {
  const key = `${kind}/${suit}`;
  const hit = faceCache.get(key);
  if (hit) return hit;

  const def = CARD_DEFS[kind];
  const accent = hex(def.category === 'blue' ? Colors.cardBlue : Colors.cardBrown);
  const paper = hex(Colors.paper);
  const edge = hex(Colors.paperEdge);
  const pip = hex(suit === 'hearts' || suit === 'diamonds' ? Colors.suitRed : Colors.suitBlack);
  const emblemColor: RGBA = [accent[0], accent[1], accent[2], 70];
  const emblem = EMBLEM[kind];

  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 7)) return accent;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 9)) return edge;
    return paper;
  });

  // 가운데 문장
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / 40;
    const ny = -(y - FACE_H / 2 - 6) / 40;
    return insideEmblem(emblem, nx, ny) ? emblemColor : null;
  });

  // 무늬: 왼쪽 위, 오른쪽 아래(뒤집어서)
  const pipSize = 11;
  const drawPip = (cx: number, cy: number, flip: boolean) => {
    for (let y = -pipSize; y <= pipSize; y++)
      for (let x = -pipSize; x <= pipSize; x++) {
        const nx = x / pipSize;
        const ny = (flip ? y : -y) / pipSize;
        if (insideSuit(suit, nx, ny)) p.put(cx + x, cy + y, pip);
      }
  };
  drawPip(22, 24, false);
  drawPip(FACE_W - 22, FACE_H - 24, true);

  // 파랑 카드는 위쪽에 띠를 하나 더 둬서 멀리서도 구분된다
  if (def.category === 'blue') {
    p.each((x, y) => (y >= 9 && y < 15 && insideRoundRect(x, y, FACE_W, FACE_H, radius, 9) ? accent : null));
  }

  const tex = p.toTexture();
  faceCache.set(key, tex);
  return tex;
}

let backTexture: THREE.DataTexture | null = null;

export function cardBackTexture(): THREE.DataTexture {
  if (backTexture) return backTexture;
  const base = hex(Colors.surfaceRaised);
  const border = hex(Colors.border);
  const mark = hex(Colors.cardBrown);
  const inner: RGBA = [mark[0], mark[1], mark[2], 160];
  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 6)) return border;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 12) && insideRoundRect(x, y, FACE_W, FACE_H, radius, 10))
      return inner;
    return base;
  });
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / 34;
    const ny = -(y - FACE_H / 2) / 34;
    return insideStar(nx, ny) ? mark : null;
  });
  backTexture = p.toTexture();
  return backTexture;
}

let eventTexture: THREE.DataTexture | null = null;

/** 하이 눈 이벤트 카드. 보라 테두리, 글자는 오버레이가 */
export function eventCardTexture(): THREE.DataTexture {
  if (eventTexture) return eventTexture;
  const accent = hex(Colors.renegade);
  const paper = hex(Colors.paper);
  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 7)) return accent;
    return paper;
  });
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / 36;
    const ny = -(y - FACE_H / 2) / 36;
    return insideStar(nx, ny) ? ([accent[0], accent[1], accent[2], 60] as RGBA) : null;
  });
  eventTexture = p.toTexture();
  return eventTexture;
}

// ---------------------------------------------------------------------------
// 이펙트용
// ---------------------------------------------------------------------------

let glowTexture: THREE.DataTexture | null = null;

/** 흰색 방사형 글로우. 색은 머티리얼에서 곱한다 */
export function radialGlowTexture(): THREE.DataTexture {
  if (glowTexture) return glowTexture;
  const n = 64;
  const p = new Painter(n, n);
  p.each((x, y) => {
    const dx = (x + 0.5) / n - 0.5;
    const dy = (y + 0.5) / n - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    const a = Math.max(0, 1 - r);
    return [255, 255, 255, Math.round(a * a * 255)];
  });
  glowTexture = p.toTexture();
  glowTexture.generateMipmaps = false;
  glowTexture.minFilter = THREE.LinearFilter;
  return glowTexture;
}

let ringTex: THREE.DataTexture | null = null;

/** 얇은 흰 고리. 충격파·방패 */
export function ringTexture(): THREE.DataTexture {
  if (ringTex) return ringTex;
  const n = 64;
  const p = new Painter(n, n);
  p.each((x, y) => {
    const dx = (x + 0.5) / n - 0.5;
    const dy = (y + 0.5) / n - 0.5;
    const r = Math.hypot(dx, dy) * 2;
    const a = Math.max(0, 1 - Math.abs(r - 0.8) / 0.2);
    return [255, 255, 255, Math.round(a * 255)];
  });
  ringTex = p.toTexture();
  ringTex.generateMipmaps = false;
  ringTex.minFilter = THREE.LinearFilter;
  return ringTex;
}

let feltTex: THREE.DataTexture | null = null;

/** 펠트 잡음. 색은 머티리얼에서 곱한다 */
export function feltNoiseTexture(): THREE.DataTexture {
  if (feltTex) return feltTex;
  const n = 128;
  const p = new Painter(n, n);
  let seed = 7;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  p.each(() => {
    const v = 225 + Math.round(rnd() * 30);
    return [v, v, v, 255];
  });
  feltTex = p.toTexture();
  feltTex.wrapS = feltTex.wrapT = THREE.RepeatWrapping;
  feltTex.repeat.set(6, 6);
  feltTex.colorSpace = THREE.NoColorSpace;
  return feltTex;
}

// ---------------------------------------------------------------------------
// 원본 그림 (설치돼 있을 때만)
// ---------------------------------------------------------------------------

const artCache = new Map<ImageSourcePropType, Promise<THREE.Texture | null>>();

/** 카드 그림을 텍스처로. 실패하면 null — 호출자는 픽셀 텍스처를 그대로 쓴다 */
export function loadArtTexture(source: ImageSourcePropType): Promise<THREE.Texture | null> {
  const hit = artCache.get(source);
  if (hit) return hit;
  const p = (async () => {
    try {
      const asset = Asset.fromModule(source as number);
      await asset.downloadAsync();
      const uri = asset.localUri ?? asset.uri;
      if (!uri) return null;
      const tex = await new THREE.TextureLoader().loadAsync(uri);
      tex.colorSpace = THREE.SRGBColorSpace;
      return tex;
    } catch {
      return null;
    }
  })();
  artCache.set(source, p);
  return p;
}
