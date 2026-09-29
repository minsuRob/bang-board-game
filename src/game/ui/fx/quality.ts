/**
 * 연출 화질.
 *
 * - high: Skia 로 그리는 세밀한 연출 (웹은 처음 한 번 CanvasKit 을 받는다)
 * - normal: RN Animated 로 그리는 가벼운 연출
 *
 * 첫 메뉴에서 고르고 기기마다 기억한다. 고화질이어도 Skia 를 못 불러오면 일반으로 대신한다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStore } from 'zustand/vanilla';

export type FxQuality = 'high' | 'normal';

const KEY = 'bang.fx.quality';

export const fxQuality = createStore<{ quality: FxQuality }>(() => ({ quality: 'high' }));

// 저장된 값을 한 번 읽는다. 못 읽으면 기본값(고화질)
AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'high' || v === 'normal') fxQuality.setState({ quality: v });
  })
  .catch(() => {});

export function setFxQuality(quality: FxQuality) {
  fxQuality.setState({ quality });
  AsyncStorage.setItem(KEY, quality).catch(() => {});
}
