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
import { loadWesternFonts } from './western-fonts';

/** 그림 가장자리의 종이색. 그림이 화면보다 작게 남는 곳도 이 색으로 이어진다 */
export const MENU_PAPER = '#f3ead6';

/**
 * veil: 그림 위에 덮는 종이색 농도 (0~1). 글이 많은 화면(판 설정·도감)은 그림을 옅게 깔아 글을 앞세운다.
 * 메뉴 화면이 쓰는 서부 글꼴도 여기서 불러온다.
 */
export function MenuBackdrop({ veil = 0 }: { veil?: number }) {
  useEffect(loadWesternFonts, []);
  const art = menuBackdropArt();
  // 화면(창) 크기에 맞춘다. 내용이 길어 화면이 늘어나도 그림이 같이 커져 양 끝 사람이 잘리지 않게
  const { width, height } = useWindowDimensions();
  return (
    <View style={[StyleSheet.absoluteFill, styles.paper]} pointerEvents="none">
      {art && <Image source={art} style={[styles.art, { width, height }]} resizeMode="cover" />}
      {veil > 0 && <View style={[StyleSheet.absoluteFill, styles.paper, { opacity: veil }]} />}
    </View>
  );
}

const styles = StyleSheet.create({
  paper: { backgroundColor: MENU_PAPER },
  art: { position: 'absolute', top: 0, left: 0 },
});
