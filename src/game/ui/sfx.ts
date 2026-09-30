/**
 * 효과음.
 *
 * 소리 파일은 `scripts/gen-sfx.mjs` 가 코드로 만든 것이라 저장소에 늘 있다. 그래서 카드 그림과 달리
 * 직접 require 해도 번들이 깨지지 않는다. PC·모바일이 같은 파일을 같은 순간에 튼다.
 *
 * 종류마다 플레이어를 몇 개 미리 만들어 돌려 쓴다. 연달아 쏠 때 앞 소리를 끊지 않고,
 * 끝난 플레이어는 곧바로 처음으로 감아 두어 다음 재생이 바로 나간다.
 */

import { createAudioPlayer, type AudioPlayer } from 'expo-audio';
import { createStore } from 'zustand/vanilla';

const SOURCES = {
  gunshot: require('../../../assets/sfx/gunshot.wav'),
  bullet_whiz: require('../../../assets/sfx/bullet_whiz.wav'),
} as const;

export type SfxId = keyof typeof SOURCES;

/** 종류마다 겹쳐 틀 수 있는 수 */
const VOICES = 3;

const MUTE_KEY = 'bang.sfx.muted';
const VOLUME_KEY = 'bang.sfx.volume';

/** 볼륨은 0~100 정수로 다룬다 (UI 슬라이더와 눈금이 같다). 재생 때 0~1로 바꿔 건다. */
const DEFAULT_VOLUME = 100;

function clampVolume(v: number): number {
  if (!Number.isFinite(v)) return DEFAULT_VOLUME;
  return Math.max(0, Math.min(100, Math.round(v)));
}

function loadMuted(): boolean {
  try {
    return globalThis.localStorage?.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

function loadVolume(): number {
  try {
    const raw = globalThis.localStorage?.getItem(VOLUME_KEY);
    if (raw == null) return DEFAULT_VOLUME;
    return clampVolume(Number(raw));
  } catch {
    return DEFAULT_VOLUME;
  }
}

export const sfxSettings = createStore<{ muted: boolean; volume: number }>(() => ({
  muted: loadMuted(),
  volume: loadVolume(),
}));

export function setMuted(muted: boolean) {
  sfxSettings.setState({ muted });
  try {
    globalThis.localStorage?.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // 저장이 막혀 있어도 이번 실행 동안은 따른다
  }
}

/** 0~100. 100이면 원래 크기, 0이면 무음. 저장은 이 값 그대로 둔다. */
export function setVolume(volume: number) {
  const v = clampVolume(volume);
  sfxSettings.setState({ volume: v });
  try {
    globalThis.localStorage?.setItem(VOLUME_KEY, String(v));
  } catch {
    // 저장이 막혀 있어도 이번 실행 동안은 따른다
  }
}

const pools = new Map<SfxId, { players: AudioPlayer[]; next: number }>();

function poolOf(id: SfxId) {
  let pool = pools.get(id);
  if (!pool) {
    const players = Array.from({ length: VOICES }, () => {
      const p = createAudioPlayer(SOURCES[id]);
      p.addListener('playbackStatusUpdate', (s) => {
        if (s.didJustFinish) void p.seekTo(0);
      });
      return p;
    });
    pool = { players, next: 0 };
    pools.set(id, pool);
  }
  return pool;
}

/** 판에 들어갈 때 미리 불러 둔다. 첫 발이 늦게 나지 않게 */
export function preloadSfx() {
  for (const id of Object.keys(SOURCES) as SfxId[]) poolOf(id);
}

export function playSfx(id: SfxId) {
  const { muted, volume } = sfxSettings.getState();
  if (muted || volume <= 0) return;
  try {
    const pool = poolOf(id);
    const p = pool.players[pool.next];
    pool.next = (pool.next + 1) % pool.players.length;
    try {
      p.volume = volume / 100;
    } catch {
      // 볼륨 설정이 막혀 있어도 재생은 계속한다
    }
    // 보통은 끝날 때 감아 두었으므로 바로 튼다. 아직 울리는 중이면 감고 튼다
    if (p.currentTime > 0.01) void p.seekTo(0).then(() => p.play());
    else p.play();
  } catch (err) {
    // 소리가 안 나도 판은 계속된다
    console.warn('효과음을 틀지 못했다', err);
  }
}
