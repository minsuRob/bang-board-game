/**
 * 카드·보드 그림을 앱을 켜자마자 전부 받아 둔다.
 *
 * 판이 열린 뒤에 받기 시작하면 캐릭터 고르기 카드가 빈 채로 뜨고, 3D 테이블은 픽셀 카드로
 * 그려졌다가 하나씩 그림으로 바뀐다. 첫 화면에 있는 동안 2D(<Image>)가 쓸 소스와 3D 텍스처를
 * 함께 채워 두면 판이 열릴 때 이미 다 들어와 있다.
 *
 * 그림이 없으면 곧바로 끝난다. 받다가 실패하거나 너무 오래 걸려도 판은 연다. 그림은 보기에만
 * 관여하므로 늦게 뜰 뿐이다.
 */

import { Asset } from 'expo-asset';
import { useSyncExternalStore } from 'react';
import { Platform, type ImageSourcePropType } from 'react-native';
import { createStore } from 'zustand/vanilla';

import { loadArtTexture } from '../table3d/materials/textures';
import { allArt, setResolvedArt } from './card-art';

/** 3D 테이블이 텍스처로 쓰는 그림. 나머지(이벤트·나무·가죽)는 2D 에서만 쓴다 */
const TEXTURE_KEY = /^(card\/|character\/|role\/|back\.png$|board\/player-board\.)/;

/** 이보다 오래 걸리면 기다리지 않고 판을 연다. 받기는 뒤에서 계속된다 */
const MAX_WAIT_MS = 10_000;

export const artPreload = createStore<{ loaded: number; total: number; done: boolean }>(() => ({
  loaded: 0,
  total: 0,
  done: false,
}));

let running: Promise<void> | null = null;

export function preloadArt(): Promise<void> {
  running ??= (async () => {
    const items = allArt();
    artPreload.setState({ total: items.length });
    const jobs = items.map(async ({ key, source }) => {
      try {
        const ready = await fetchImage(source);
        if (ready !== source) setResolvedArt(key, ready);
        if (TEXTURE_KEY.test(key)) await loadArtTexture(ready);
      } catch {
        /* 이 그림만 늦게 뜬다 */
      }
      artPreload.setState((s) => ({ loaded: s.loaded + 1 }));
    });
    await Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, MAX_WAIT_MS))]);
    artPreload.setState({ done: true });
  })();
  return running;
}

/**
 * 그림을 받아 곧바로 그릴 수 있는 소스로 돌려준다.
 * 웹은 blob URL 로 메모리에 붙잡아 둔다. 개발 서버가 no-store 로 내보내 브라우저 캐시를
 * 믿을 수 없기 때문이다. 앱은 번들에 든 파일을 기기에 받아 두면 그걸로 충분하다.
 */
async function fetchImage(source: ImageSourcePropType): Promise<ImageSourcePropType> {
  const asset = Asset.fromModule(source as number);
  if (Platform.OS !== 'web') {
    await asset.downloadAsync();
    return source;
  }
  const res = await fetch(asset.uri);
  if (!res.ok) return source;
  const uri = URL.createObjectURL(await res.blob());
  return { uri };
}

/** 그림을 다 받았는가 (또는 기다리기를 포기했는가) */
export function useArtReady(): boolean {
  return useSyncExternalStore(
    artPreload.subscribe,
    () => artPreload.getState().done,
    () => false,
  );
}

/** 받은 장수. 로딩 문구에 쓴다 */
export function useArtProgress(): { loaded: number; total: number } {
  const loaded = useSyncExternalStore(
    artPreload.subscribe,
    () => artPreload.getState().loaded,
    () => 0,
  );
  const total = useSyncExternalStore(
    artPreload.subscribe,
    () => artPreload.getState().total,
    () => 0,
  );
  return { loaded, total };
}
