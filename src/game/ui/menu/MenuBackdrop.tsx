/**
 * 첫 화면 바탕: 정오의 큰길에서 두 총잡이가 서로를 겨누는 수채 그림.
 *
 * 그림은 docs/menu-prototypes/sketch-backgrounds.html 에서 캔버스로 그려 뽑은
 * assets/board/menu-high-noon.jpg 다 (과정은 docs/menu-design.md).
 * 두 사람이 화면 양 끝에 서 있어 가운데 제목과 카드 부채가 그 총구 사이에 놓인다.
 * 그림이 없으면 같은 종이색만 깐다.
 */

import { useEffect } from 'react';
import { Image, StyleSheet, useWindowDimensions, View } from 'react-native';

import { menuBackdropArt } from '../card-art';
import { useColors, useScheme } from '../theme/use-theme';
import { loadWesternFonts } from './western-fonts';

/**
 * veil: 그림 위에 덮는 종이색 농도 (0~1). 글이 많은 화면(판 설정·도감)은 그림을 옅게 깔아 글을 앞세운다.
 * 다크 테마에서는 같은 그림에 밤빛을 덮는다. 낮 그림이 그대로 밝게 남지 않게 늘 절반 넘게 덮는다.
 * 메뉴 화면이 쓰는 서부 글꼴도 여기서 불러온다.
 */
export function MenuBackdrop({ veil = 0 }: { veil?: number }) {
  useEffect(loadWesternFonts, []);
  const art = menuBackdropArt();
  // 화면(창) 크기에 맞춘다. 내용이 길어 화면이 늘어나도 그림이 같이 커져 양 끝 사람이 잘리지 않게
  const { width, height } = useWindowDimensions();
  const c = useColors();
  const night = useScheme() === 'dark';
  const cover = night ? Math.min(0.88, 0.62 + veil * 0.4) : veil;
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: c.background }]} pointerEvents="none">
      {art && <Image source={art} style={[styles.art, { width, height }]} resizeMode="cover" />}
      {cover > 0 && <View style={[StyleSheet.absoluteFill, { backgroundColor: c.veil, opacity: cover }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  art: { position: 'absolute', top: 0, left: 0 },
});
