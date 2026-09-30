/**
 * 넓은 3D 화면의 하단 바 왼쪽 절반. 내 이름·캐릭터·역할·목숨·장비.
 *
 * 능력 문구는 여기 없다. 내 보드의 캐릭터 카드에 마우스를 올리면 왼쪽 아래 자리에 뜬다.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import { ROLE_LABEL } from '../data/roles';
import { kindOf, type Player } from '../engine';
import { ROLE_COLOR } from './overlay/SeatLabel';
import { Colors, Radius, Spacing } from '@/constants/theme';

export function SelfStatus({
  player,
  active,
  targetable,
  onPress,
}: {
  player: Player;
  active: boolean;
  targetable: boolean;
  onPress: () => void;
}) {
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const hp = Math.max(0, player.hp);
  const equipment = player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ');

  return (
    <Pressable
      onPress={onPress}
      disabled={!targetable}
      accessibilityRole={targetable ? 'button' : undefined}
      accessibilityLabel={`나 · ${character.nameKo} · 목숨 ${hp}/${player.maxHp}`}
      style={[styles.wrap, active && styles.active, targetable && styles.targetable, dead && styles.dead]}>
      <View style={styles.row}>
        <Text style={styles.name}>나</Text>
        <Text style={styles.character} numberOfLines={1}>
          {character.nameKo}
          {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
        </Text>
        <Text style={[styles.roleChip, { backgroundColor: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
      </View>
      <View style={styles.row}>
        <Text style={styles.hp}>
          {'●'.repeat(hp)}
          <Text style={styles.hpEmpty}>{'○'.repeat(Math.max(0, player.maxHp - hp))}</Text>
          <Text style={styles.hpNumber}>
            {'  '}
            {hp}/{player.maxHp}
          </Text>
        </Text>
        {!!equipment && (
          <Text style={styles.equipment} numberOfLines={1}>
            {equipment}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: Colors.sheriff },
  targetable: { borderColor: Colors.highlight, boxShadow: `0 0 10px ${Colors.highlight}` },
  dead: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { color: Colors.text, fontSize: 16, fontWeight: '900' },
  character: { color: Colors.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  roleChip: {
    color: '#1A120A',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  hp: { color: Colors.hp, fontSize: 15, letterSpacing: 2 },
  hpEmpty: { color: Colors.border },
  hpNumber: { color: Colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  equipment: { color: Colors.deputy, fontSize: 12, flexShrink: 1 },
});
