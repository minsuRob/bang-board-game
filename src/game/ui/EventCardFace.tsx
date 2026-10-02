/**
 * 이벤트 카드 앞면 (하이 눈 · 와일드 웨스트 쇼).
 *
 * 그림이 설치돼 있으면 스캔을, 없으면 종이 카드에 이름을 적는다.
 * 가운데 스포트라이트와 카드 도감이 같이 쓴다.
 */

import { Image, StyleSheet, Text, View } from 'react-native';

import type { EventCardDef } from '../data/types';
import { eventArt } from './card-art';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** 이벤트 스캔 비율 (260×389) */
export const EVENT_RATIO = 260 / 389;

export function EventCardFace({ def, width }: { def: EventCardDef; width: number }) {
  const art = eventArt(def.id);
  const size = { width, height: Math.round(width / EVENT_RATIO) };
  if (art) {
    return <Image source={art} style={[styles.art, size]} resizeMode="cover" accessibilityLabel={def.nameKo} />;
  }
  // 작게 그릴 때는 글자를 줄인다
  const small = width < 110;
  return (
    <View style={[styles.fallback, size]}>
      <Text style={styles.kicker}>이벤트</Text>
      <Text style={[styles.name, small && styles.nameSmall]} numberOfLines={2}>
        {def.nameKo}
      </Text>
      <Text style={styles.en} numberOfLines={1}>
        {def.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { borderRadius: Radius.md },
  fallback: {
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    padding: Spacing.two,
  },
  kicker: { color: Colors.renegade, fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  name: { color: Colors.textOnPaper, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  nameSmall: { fontSize: 13 },
  en: { color: Colors.cardBrown, fontSize: 11, fontStyle: 'italic' },
});
