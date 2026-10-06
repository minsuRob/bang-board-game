/**
 * 캐릭터 한 명의 카드 그림과 상세 설명.
 *
 * `CharacterDetail` 은 카드·이름·직업·목숨·손패·거리·장착·능력 문구를 한 묶음으로 그린다.
 * `CharacterDetailModal` 은 그걸 화면 가운데에 띄우고 바깥을 누르면 닫는다.
 * hover 가 없는 폰에서 상대 캐릭터를 탭했을 때 쓴다.
 */

import { Pressable, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import type { Role } from '../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../engine';
import { CharacterCard } from './CharacterCard';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles, useColors } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { Radius, Spacing, type ThemeColors } from '@/constants/theme';
import { HpPips } from './HpPips';
import { useNames } from '../../i18n/use-names';

/** 역할 색. 테마마다 종이·밤 바탕에서 읽히는 색이 다르다 */
function roleColor(c: ThemeColors, role: Role): string {
  return c[role];
}

export function CharacterDetail({
  view,
  viewer,
  player,
  compact = true,
}: {
  view: GameState;
  viewer: PlayerId;
  player: Player;
  /** 카드를 작게 (미리보기 자리). 끄면 기본 크기 */
  compact?: boolean;
}) {
  const styles = useStyles();
  const c = useColors();
  const t = useT();
  const names = useNames();
  const isSelf = player.id === viewer;
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const hp = Math.max(0, player.hp);
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;
  return (
    <View style={styles.body}>
      <View style={styles.top}>
        <CharacterCard id={player.character} compact={compact} />
        <View style={styles.info}>
          <View style={styles.head}>
            <Text style={styles.name} numberOfLines={1}>
              {isSelf ? t.ui.character.me : player.name}
            </Text>
            {(player.roleRevealed || isSelf) && (
              <Text style={[styles.role, { color: roleColor(c, player.role) }]}>{names.roleName(player.role)}</Text>
            )}
          </View>
          <Text style={styles.character}>
            {names.charName(player.character)}
            {player.ghost ? t.ui.character.ghost : dead ? t.ui.character.removed : ''}
          </Text>
          <View style={styles.hpRow}>
            <HpPips hp={hp} maxHp={player.maxHp} style={styles.hp} emptyStyle={styles.hpEmpty} />
            <Text style={styles.hpNumber}>
              {hp}/{player.maxHp}
            </Text>
          </View>
          {!isSelf && (
            <Text style={styles.meta}>
              {t.ui.character.meta(player.hand.length, dist)}
            </Text>
          )}
          {player.equipment.length > 0 && (
            <Text style={styles.equipment}>{player.equipment.map((e) => names.cardName(kindOf(e))).join(' · ')}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.ability, compact && styles.abilityCompact]}>{names.charAbility(player.character)}</Text>
      {/* 그레고리 덱이 빌린 기본판 캐릭터 */}
      {(player.borrowed ?? []).map((b) => (
        <Text key={b} style={[styles.ability, compact && styles.abilityCompact]}>
          {t.ui.character.borrowed(names.charName(b), names.charAbility(b))}
        </Text>
      ))}
    </View>
  );
}

/** 화면 가운데에 띄운다. 바깥이나 닫기를 누르면 onClose */
export function CharacterDetailModal({
  view,
  viewer,
  player,
  onClose,
}: {
  view: GameState;
  viewer: PlayerId;
  player: Player;
  onClose: () => void;
}) {
  const styles = useStyles();
  const t = useT();
  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.ui.character.closeLabel} onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <CharacterDetail view={view} viewer={viewer} player={player} compact={false} />
        <Pressable accessibilityRole="button" accessibilityLabel={t.ui.character.close} onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>{t.ui.character.close}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function safeDistance(view: GameState, from: PlayerId, to: PlayerId): number | null {
  try {
    return distance(view, from, to);
  } catch {
    return null;
  }
}

const useStyles = themedStyles((c) => ({
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
    zIndex: 50,
  },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: c.scrim },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: c.surface,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: c.rule,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: `0 14px 40px ${c.shadow}`,
  },
  close: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one + 2,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  closeText: { color: c.text, fontSize: 13, fontWeight: '700' },
  body: { gap: Spacing.two },
  top: { flexDirection: 'row', gap: Spacing.two },
  info: { flex: 1, minWidth: 0, gap: 3 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one },
  name: { color: c.heading, fontSize: 16, fontWeight: '900', flexShrink: 1, fontFamily: WesternFonts.label },
  role: { fontSize: 11, fontWeight: '800' },
  character: { color: c.text, fontSize: 13, fontWeight: '700' },
  hp: { color: c.hp, fontSize: 13, letterSpacing: 1 },
  hpEmpty: { color: c.border },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  hpNumber: { color: c.text, fontSize: 12, fontWeight: '800', letterSpacing: 0 },
  meta: { color: c.textMuted, fontSize: 11 },
  equipment: { color: c.deputy, fontSize: 11 },
  ability: { color: c.text, fontSize: 13, lineHeight: 19, fontFamily: WesternFonts.body },
  abilityCompact: { fontSize: 12, lineHeight: 17 },
}));
