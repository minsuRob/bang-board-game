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
import type { CardKind, Role, Suit } from '../../data/types';
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
// 플레이어 보드·역할·캐릭터 (그림이 없을 때)
// ---------------------------------------------------------------------------

export const BOARD_TEX_W = 256;
export const BOARD_TEX_H = 182;

/** 캡슐(둥근 막대) 안인가. (ax,ay)→(bx,by) 선분에서 r 이내 */
function nearSegment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(x - (ax + dx * t), y - (ay + dy * t));
}

let boardTex: THREE.DataTexture | null = null;

/**
 * 플레이어 보드. 원본 그림과 같은 자리에 총알 윤곽 5개와 슬롯 3칸을 찍는다.
 * 좌표는 core/layout.ts 의 BOARD_SLOTS 와 맞춘다.
 */
export function playerBoardTexture(): THREE.DataTexture {
  if (boardTex) return boardTex;
  const W = BOARD_TEX_W;
  const H = BOARD_TEX_H;
  const sky = hex('#B98F4E');
  const ground = hex('#6E4A2B');
  const line: RGBA = [246, 238, 220, 235];
  const p = new Painter(W, H);
  p.each((x, y) => {
    const t = y / H;
    const c = (i: number) => Math.round(sky[i] * (1 - t) + ground[i] * t);
    if (!insideRoundRect(x, y, W, H, 10, 0)) return null;
    return [c(0), c(1), c(2), 255];
  });

  // 총알 윤곽 5개: 왼쪽 위에서 오른쪽 아래로 기운 캡슐
  const bulletU = [-0.373, -0.192, -0.005, 0.183, 0.37];
  for (const u of bulletU) {
    const cx = (0.5 + u) * W;
    const cy = 0.15 * H;
    const len = 17;
    const ax = cx - len * 0.82;
    const ay = cy - len * 0.57;
    const bx = cx + len * 0.82;
    const by = cy + len * 0.57;
    p.each((x, y) => {
      const d = nearSegment(x, y, ax, ay, bx, by);
      return d > 5 && d < 7 ? line : null;
    });
  }

  // 슬롯 3칸: 흰 선 둥근 사각형
  const slotU = [-0.317, 0, 0.32];
  const sw = 0.288 * W;
  const sh = 0.65 * H;
  const sy = (0.5 + 0.116) * H - sh / 2;
  slotU.forEach((u, i) => {
    const sx = (0.5 + u) * W - sw / 2;
    p.each((x, y) => {
      const lx = x - sx;
      const ly = y - sy;
      const inOuter = insideRoundRect(lx, ly, sw, sh, 8, 0);
      const inInner = insideRoundRect(lx, ly, sw, sh, 8, 2);
      return inOuter && !inInner ? line : null;
    });
    // 오른쪽 칸에는 기본 무기(콜트 .45) 자리를 파란 테두리 카드로
    if (i === 2) {
      const cw = sw * 0.62;
      const ch = sh * 0.62;
      const cx = (0.5 + u) * W - cw / 2 + 4;
      const cy = sy + sh / 2 - ch / 2;
      const blue = hex(Colors.cardBlue);
      const paper = hex(Colors.paper);
      p.each((x, y) => {
        const lx = x - cx;
        const ly = y - cy;
        if (!insideRoundRect(lx, ly, cw, ch, 5, 0)) return null;
        if (!insideRoundRect(lx, ly, cw, ch, 5, 3)) return blue;
        // 가운데 권총 실루엣 대신 가로 막대
        if (Math.abs(ly - ch * 0.45) < 3 && lx > cw * 0.2 && lx < cw * 0.8) return blue;
        return paper;
      });
    }
  });

  boardTex = p.toTexture();
  return boardTex;
}

let bulletTex: THREE.DataTexture | null = null;

/** 목숨 총알 한 발. 가로로 누운 모양: 왼쪽 놋쇠 탄피, 오른쪽 구리 탄두 */
export function bulletTexture(): THREE.DataTexture {
  if (bulletTex) return bulletTex;
  const W = 96;
  const H = 32;
  const brass = hex('#E0B04A');
  const brassDark = hex('#9C7424');
  const copper = hex('#C8703A');
  const shine: RGBA = [255, 244, 200, 170];
  const p = new Painter(W, H);
  const cy = H / 2;
  p.each((x, y) => {
    const dy = Math.abs(y - cy);
    // 탄피 테두리 (뒷면 림)
    if (x >= 4 && x < 10 && dy < 13) return brassDark;
    // 탄피 몸통
    if (x >= 10 && x < 58 && dy < 11) return y < cy - 5 && y > cy - 9 ? shine : brass;
    // 탄두: 둥근 끝
    if (x >= 58 && x < 92) {
      const t = (x - 58) / 34;
      const r = 11 * Math.sqrt(Math.max(0, 1 - t * t));
      if (dy < r) return y < cy - r * 0.45 && y > cy - r * 0.8 ? shine : copper;
    }
    return null;
  });
  bulletTex = p.toTexture();
  return bulletTex;
}

/** 역할 카드 뒷면의 보안관 배지. 여섯 꼭짓점 별 + 끝의 구슬 */
function insideBadge(x: number, y: number): boolean {
  const a = Math.atan2(y, x) + Math.PI / 2;
  const r = Math.hypot(x, y);
  const k = Math.abs(Math.cos(a * 3));
  if (r < 0.34 + 0.46 * Math.pow(k, 3)) return true;
  for (let i = 0; i < 6; i++) {
    const t = (i * Math.PI) / 3 - Math.PI / 2;
    if (Math.hypot(x - 0.84 * Math.cos(t), y - 0.84 * Math.sin(t)) < 0.1) return true;
  }
  return false;
}

let roleBackTex: THREE.DataTexture | null = null;

/** 역할 카드 뒷면. 일반 카드 뒷면과 구분되게 짙은 바탕에 금색 배지 */
export function roleBackTexture(): THREE.DataTexture {
  if (roleBackTex) return roleBackTex;
  const base = hex('#2E1F12');
  const gold = hex(Colors.sheriff);
  const goldSoft: RGBA = [gold[0], gold[1], gold[2], 150];
  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 5)) return gold;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 11) && insideRoundRect(x, y, FACE_W, FACE_H, radius, 9))
      return goldSoft;
    return base;
  });
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / 44;
    const ny = (y - FACE_H / 2) / 44;
    if (!insideBadge(nx, ny)) return null;
    return Math.hypot(nx, ny) < 0.22 ? base : gold;
  });
  roleBackTex = p.toTexture();
  return roleBackTex;
}

const ROLE_TINT: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

const roleFaceTex = new Map<Role, THREE.DataTexture>();

/** 역할 카드 앞면. 역할색 테두리와 배지. 글자는 라벨이 맡는다 */
export function roleFaceTexture(role: Role): THREE.DataTexture {
  const hit = roleFaceTex.get(role);
  if (hit) return hit;
  const tint = hex(ROLE_TINT[role]);
  const paper = hex(Colors.paper);
  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 8)) return tint;
    return paper;
  });
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / 40;
    const ny = (y - FACE_H / 2) / 40;
    return insideBadge(nx, ny) ? tint : null;
  });
  const tex = p.toTexture();
  roleFaceTex.set(role, tex);
  return tex;
}

/** 캐릭터 카드 초상 창. 카드 비율 좌표 (가운데 원점, 위가 +) */
export const PORTRAIT_WINDOW = { w: 0.84, h: 0.62, y: 0.13 } as const;

let characterTex: THREE.DataTexture | null = null;

/** 캐릭터 카드 틀. 초상은 위에 평면을 하나 더 얹는다 */
export function characterFrameTexture(): THREE.DataTexture {
  if (characterTex) return characterTex;
  const brown = hex(Colors.cardBrown);
  const paper = hex(Colors.paper);
  const window = hex('#CDB689');
  const p = new Painter(FACE_W, FACE_H);
  const radius = 12;
  const ww = PORTRAIT_WINDOW.w * FACE_W;
  const wh = PORTRAIT_WINDOW.h * FACE_H;
  const wx = (FACE_W - ww) / 2;
  const wy = FACE_H * (0.5 - PORTRAIT_WINDOW.y) - wh / 2;
  p.each((x, y) => {
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 0)) return null;
    if (!insideRoundRect(x, y, FACE_W, FACE_H, radius, 6)) return brown;
    if (x >= wx && x < wx + ww && y >= wy && y < wy + wh) return window;
    return paper;
  });
  // 창 안의 사람 실루엣 (그림이 없을 때만 보인다)
  const sil = hex(Colors.cardBrown, 90);
  p.each((x, y) => {
    const nx = (x - FACE_W / 2) / (ww / 2);
    const ny = (y - (wy + wh / 2)) / (wh / 2);
    const head = Math.hypot(nx, (ny + 0.25) * 1.1) < 0.28;
    const hat = Math.abs(ny + 0.5) < 0.07 && Math.abs(nx) < 0.5;
    const body = ny > 0.1 && ny < 1 && Math.abs(nx) < 0.3 + (ny - 0.1) * 0.5;
    return head || hat || body ? sil : null;
  });
  // 아래쪽 목숨 자리 띠
  p.each((x, y) => (y > FACE_H - 30 && y < FACE_H - 26 && x > 20 && x < FACE_W - 20 ? brown : null));
  characterTex = p.toTexture();
  return characterTex;
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
