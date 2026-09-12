/**
 * 기기 등급.
 *
 * 파티클 수·안티앨리어싱 같은 예산을 정한다. 정확할 필요는 없고 낮은 폰에서 버벅이지만 않으면 된다.
 */

import * as Device from 'expo-device';
import { Platform } from 'react-native';

import type { DeviceTier, FxBudget } from './types';

const GB = 1024 * 1024 * 1024;

export function getDeviceTier(): DeviceTier {
  if (Platform.OS === 'web') {
    const nav = globalThis.navigator as { deviceMemory?: number; hardwareConcurrency?: number } | undefined;
    if (!nav) return 'high';
    if (nav.deviceMemory !== undefined && nav.deviceMemory < 4) return 'low';
    if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency < 4) return 'low';
    return 'high';
  }
  const mem = Device.totalMemory;
  if (mem !== null && mem < 3.5 * GB) return 'low';
  return 'high';
}

export function budgetFor(tier: DeviceTier): FxBudget {
  return tier === 'high'
    ? { tier, particles: 1024, antialias: true, contactShadow: true }
    : { tier, particles: 256, antialias: false, contactShadow: false };
}
