/**
 * 캐릭터 카드 한 장 (드래프트 후보).
 *
 * 그림이 설치되어 있으면 그 그림에 한국어 이름 띠를 얹고,
 * 없으면 이름·목숨·능력 문구만으로 그린다.
 */

import { StyleSheet, Text, View } from 'react-native';

import { CHARACTERS } from '../data/characters';
import type { CharacterId } from '../data/types';
import { characterArt } from './card-art';
import { CharacterPortraitImage } from './CharacterPortraitImage';
import { Colors, Radius, Spacing } from '@/constants/theme';

// 그림은 카드 통째가 아니라 초상 칸만 잘라 쓴다. 이름은 아래 띠가 한국어로 대신한다
export const CHARACTER_CARD = { width: 150, height: 214 } as const;
const BORDER = 2;

/** `width` 를 주면 그 폭에 원래 비율로 맞춘다 */
export function CharacterCard({ id, compact, width }: { id: CharacterId; compact?: boolean; width?: number }) {
  const def = CHARACTERS[id];
  const art = characterArt(id);
  const w = width ?? (compact ? 112 : CHARACTER_CARD.width);
  const h = width ? Math.round((width * CHARACTER_CARD.height) / CHARACTER_CARD.width) : compact ? 160 : CHARACTER_CARD.height;
  // 작게 줄였으면 이름이 잘리지 않게 목숨 점은 뺀다
  const showHp = !width || width >= 130;
  const tiny = !!width && width < 100;

  return (
    <View style={[styles.card, { width: w, height: h }]}>
      {art ? (
        <>
          <CharacterPortraitImage id={id} width={w - BORDER * 2} height={h - BORDER * 2} />
          <View style={[styles.strip, tiny && styles.stripTiny]}>
            <Text style={[styles.stripName, tiny && styles.stripNameTiny]} numberOfLines={1}>
              {def.nameKo}
            </Text>
            {showHp && <Text style={styles.stripHp}>{'●'.repeat(def.maxHp)}</Text>}
          </View>
        </>
      ) : (
        <View style={styles.plain}>
          <Text style={[styles.name, compact && { fontSize: 14 }]} numberOfLines={1}>
            {def.nameKo}
          </Text>
          <Text style={styles.nameEn} numberOfLines={1}>
            {def.name}
          </Text>
          <Text style={styles.hp}>{'●'.repeat(def.maxHp)}</Text>
          <View style={styles.rule} />
          <Text style={[styles.ability, compact && { fontSize: 10, lineHeight: 13 }]} numberOfLines={compact ? 6 : 8}>
            {def.ability}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.md,
    borderWidth: BORDER,
    borderColor: Colors.paperEdge,
    backgroundColor: Colors.paper,
    overflow: 'hidden',
  },
  plain: { flex: 1, padding: Spacing.two, gap: 2 },
  name: { color: Colors.textOnPaper, fontSize: 17, fontWeight: '900' },
  nameEn: { color: Colors.cardBrown, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  hp: { color: Colors.hp, fontSize: 13, letterSpacing: 2, marginTop: 2 },
  rule: { height: 1, backgroundColor: Colors.paperEdge, marginVertical: Spacing.one },
  ability: { color: Colors.textOnPaper, fontSize: 11, lineHeight: 15 },
  strip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
    backgroundColor: 'rgba(30, 20, 11, 0.86)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stripName: { color: Colors.text, fontWeight: '800', fontSize: 12, flexShrink: 1 },
  stripTiny: { paddingHorizontal: 3 },
  stripNameTiny: { fontSize: 10 },
  stripHp: { color: Colors.hp, fontSize: 10, letterSpacing: 1 },
});
