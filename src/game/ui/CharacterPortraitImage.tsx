/**
 * 캐릭터 초상 그림. 부모 상자를 꽉 채운다 (resizeMode="cover" 처럼).
 *
 * 카드 통째 스캔이면 그림 칸만 잘라서 보여 준다. 상자 크기를 알아야 자를 수 있다.
 * 부모가 크기를 알려 주면 그걸 쓰고, 아니면 onLayout 으로 재서 잴 때까지는 비워 둔다.
 */

import { useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';

import type { CharacterId } from '../data/types';
import { characterPortrait } from './card-art';

export function CharacterPortraitImage({ id, width, height }: { id: CharacterId; width?: number; height?: number }) {
  const portrait = characterPortrait(id);
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null);
  const box = width && height ? { w: width, h: height } : measured;
  if (!portrait) return null;

  const { source, crop } = portrait;
  // 크기를 모르면 원본 스캔 크기로 본다 (자르는 칸이 그 기준이다)
  const size = portrait.size ?? { width: 250, height: 389 };

  let image = null;
  if (!crop) {
    image = <Image source={source} style={StyleSheet.absoluteFill} resizeMode="cover" />;
  } else if (box) {
    // 잘라 낼 칸이 상자를 덮도록 키우고, 칸의 가운데를 상자 가운데에 맞춘다
    const s = Math.max(box.w / (crop.w * size.width), box.h / (crop.h * size.height));
    const w = size.width * s;
    const h = size.height * s;
    const left = box.w / 2 - (crop.x + crop.w / 2) * w;
    const top = box.h / 2 - (crop.y + crop.h / 2) * h;
    image = (
      <Image source={source} style={{ position: 'absolute', left, top, width: w, height: h }} resizeMode="stretch" />
    );
  }

  return (
    <View
      style={[StyleSheet.absoluteFill, styles.clip]}
      onLayout={(e) => {
        if (width && height) return;
        const { layout } = e.nativeEvent;
        if (!measured || measured.w !== layout.width || measured.h !== layout.height) {
          setMeasured({ w: layout.width, h: layout.height });
        }
      }}>
      {image}
    </View>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
});
