/**
 * 3D 화면 하단 바의 내 정보. 내 이름·캐릭터·역할·목숨·장비.
 *
 * 넓은 화면은 바 왼쪽 절반에 두고, 능력 문구는 여기 없다 (내 보드의 캐릭터 카드에
 * 마우스를 올리면 왼쪽 아래 자리에 뜬다).
 * 좁은 화면(compact)은 바 위쪽에 두 줄로 얹는다. 폰엔 hover 가 없으니 목표·능력을 한 줄 붙인다.
 */

import { Pressable, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import { ROLE_GOAL, ROLE_LABEL } from '../data/roles';
import { kindOf, type Player } from '../engine';
import { usePresence } from '../store/presence';
import { PRESENCE_LABEL, PresenceDot } from '../ui/PresenceDot';
import { ROLE_COLOR } from './overlay/SeatLabel';
import { themedStyles } from '../ui/theme/use-theme';
import { Radius, Spacing } from '@/constants/theme';
import { HpPips } from '../ui/HpPips';

export function SelfStatus({
  player,
  active,
  targetable,
  onPress,
  compact,
}: {
  player: Player;
  active: boolean;
  targetable: boolean;
  onPress: () => void;
  /** 좁은 화면: 이름·목숨 한 줄, 장비·능력 한 줄 */
  compact?: boolean;
}) {
  const styles = useStyles();
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const hp = Math.max(0, player.hp);
  const equipment = player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ');
  const presence = usePresence(player.id);

  if (compact) {
    return (
      <Pressable
        onPress={onPress}
        disabled={!targetable}
        accessibilityRole={targetable ? 'button' : undefined}
        accessibilityLabel={`나${presence ? ` · ${PRESENCE_LABEL[presence]}` : ''} · ${character.nameKo} · 목숨 ${hp}/${player.maxHp}`}
        style={[styles.wrap, styles.wrapCompact, active && styles.active, targetable && styles.targetable, dead && styles.dead]}>
        <View style={styles.row}>
          <PresenceDot presence={presence} size={8} />
          <Text style={[styles.name, styles.nameCompact]}>나</Text>
          <Text style={[styles.character, styles.characterCompact]} numberOfLines={1}>
            {character.nameKo}
            {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
          </Text>
          <Text style={[styles.roleChip, styles.roleChipCompact, { backgroundColor: ROLE_COLOR[player.role] }]}>
            {ROLE_LABEL[player.role]}
          </Text>
          <View style={[styles.hpRow, styles.hpRowCompact]}>
            <HpPips hp={hp} maxHp={player.maxHp} style={[styles.hp, styles.hpCompact]} emptyStyle={styles.hpEmpty} />
            <Text style={[styles.hpNumber, styles.hpNumberCompact]}>
              {hp}/{player.maxHp}
            </Text>
          </View>
        </View>
        <Text style={styles.detail} numberOfLines={1}>
          {!!equipment && <Text style={styles.equipmentInline}>{equipment} · </Text>}
          {ROLE_GOAL[player.role]} · {character.ability}
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={!targetable}
      accessibilityRole={targetable ? 'button' : undefined}
      accessibilityLabel={`나${presence ? ` · ${PRESENCE_LABEL[presence]}` : ''} · ${character.nameKo} · 목숨 ${hp}/${player.maxHp}`}
      style={[styles.wrap, active && styles.active, targetable && styles.targetable, dead && styles.dead]}>
      <View style={styles.row}>
        <PresenceDot presence={presence} size={10} />
        <Text style={styles.name}>나</Text>
        <Text style={styles.character} numberOfLines={1}>
          {character.nameKo}
          {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
        </Text>
        <Text style={[styles.roleChip, { backgroundColor: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
      </View>
      <View style={styles.row}>
        <View style={styles.hpRow}>
          <HpPips hp={hp} maxHp={player.maxHp} style={styles.hp} emptyStyle={styles.hpEmpty} />
          <Text style={styles.hpNumber}>
            {hp}/{player.maxHp}
          </Text>
        </View>
        {!!equipment && (
          <Text style={styles.equipment} numberOfLines={1}>
            {equipment}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

const useStyles = themedStyles((c) => ({
  wrap: {
    gap: 3,
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  active: { borderColor: c.sheriff },
  targetable: { borderColor: c.highlight, boxShadow: `0 0 10px ${c.highlight}` },
  dead: { opacity: 0.45 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  name: { color: c.text, fontSize: 16, fontWeight: '900' },
  character: { color: c.text, fontSize: 14, fontWeight: '700', flexShrink: 1 },
  // 직업 칩은 판의 이름표와 같은 고정 직업색에 짙은 글자 (테마와 무관)
  roleChip: {
    color: '#1A120A',
    fontSize: 11,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 1,
    overflow: 'hidden',
  },
  hp: { color: c.hp, fontSize: 15, letterSpacing: 2 },
  hpEmpty: { color: c.border },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hpNumber: { color: c.text, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  equipment: { color: c.deputy, fontSize: 12, flexShrink: 1 },
  // 좁은 화면
  wrapCompact: { gap: 1, paddingHorizontal: Spacing.one },
  nameCompact: { fontSize: 14 },
  characterCompact: { fontSize: 12 },
  roleChipCompact: { fontSize: 10, paddingHorizontal: 6 },
  hpCompact: { fontSize: 12, letterSpacing: 1 },
  hpRowCompact: { gap: Spacing.one, marginLeft: 'auto' },
  hpNumberCompact: { fontSize: 11 },
  detail: { color: c.textMuted, fontSize: 10, lineHeight: 13 },
  equipmentInline: { color: c.deputy },
}));
