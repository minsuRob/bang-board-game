/**
 * 고화질 연출(Skia)을 늦게 불러온다.
 *
 * 웹은 CanvasKit(wasm)을 먼저 받아야 Skia 모듈을 평가할 수 있다. 그래서 Skia 를 쓰는 모듈은
 * 여기서 동적 import 로만 부른다. 한 번 불러오면 스토어에 담아 두고, 실패하면 null 로 남겨
 * 일반 연출로 대신하게 한다.
 */

import { Platform } from 'react-native';
import { createStore } from 'zustand/vanilla';

import type { CardFxSkiaLayer } from './CardFxSkia';

export type SkiaGunshot = { Layer: typeof CardFxSkiaLayer };

export const skiaFx = createStore<{ gunshot: SkiaGunshot | null; failed: boolean }>(() => ({
  gunshot: null,
  failed: false,
}));

let loading: Promise<void> | null = null;

export function loadSkiaFx(): Promise<void> {
  loading ??= (async () => {
    try {
      if (Platform.OS === 'web') {
        const { LoadSkiaWeb } = await import('@shopify/react-native-skia/lib/module/web');
        // postinstall 이 public/ 에 복사해 둔 canvaskit.wasm
        await LoadSkiaWeb({ locateFile: (file: string) => `/${file}` });
      }
      const mod = await import('./CardFxSkia');
      skiaFx.setState({ gunshot: { Layer: mod.CardFxSkiaLayer } });
    } catch (err) {
      console.warn('고화질 연출을 불러오지 못했다. 일반 연출로 대신한다', err);
      skiaFx.setState({ failed: true });
    }
  })();
  return loading;
}
