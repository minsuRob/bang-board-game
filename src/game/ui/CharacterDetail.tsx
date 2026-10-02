/**
 * 캐릭터 한 명의 카드 그림과 상세 설명.
 *
 * `CharacterDetail` 은 카드·이름·직업·목숨·손패·거리·장착·능력 문구를 한 묶음으로 그린다.
 * `CharacterDetailModal` 은 그걸 화면 가운데에 띄우고 바깥을 누르면 닫는다.
 * hover 가 없는 폰에서 상대 캐릭터를 탭했을 때 쓴다.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { CHARACTERS } from '../data/characters';
import { ROLE_LABEL } from '../data/roles';
import type { Role } from '../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../engine';
import { CharacterCard } from './CharacterCard';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

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
              {isSelf ? '나' : player.name}
            </Text>
            {(player.roleRevealed || isSelf) && (
              <Text style={[styles.role, { color: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            )}
          </View>
          <Text style={styles.character}>
            {character.nameKo}
            {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
          </Text>
          <Text style={styles.hp}>
            {'●'.repeat(hp)}
            <Text style={styles.hpEmpty}>{'○'.repeat(Math.max(0, player.maxHp - hp))}</Text>
            <Text style={styles.hpNumber}>
              {'  '}
              {hp}/{player.maxHp}
            </Text>
          </Text>
          {!isSelf && (
            <Text style={styles.meta}>
              손패 {player.hand.length}
              {dist !== null ? ` · 거리 ${dist}` : ''}
            </Text>
          )}
          {player.equipment.length > 0 && (
            <Text style={styles.equipment}>{player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ')}</Text>
          )}
        </View>
      </View>
      <Text style={[styles.ability, compact && styles.abilityCompact]}>{character.ability}</Text>
      {/* 그레고리 덱이 빌린 기본판 캐릭터 */}
      {(player.borrowed ?? []).map((c) => (
        <Text key={c} style={[styles.ability, compact && styles.abilityCompact]}>
          빌린 능력 · {CHARACTERS[c].nameKo}: {CHARACTERS[c].ability}
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
  return (
    <View style={styles.layer}>
      <Pressable accessibilityRole="button" accessibilityLabel="캐릭터 설명 닫기" onPress={onClose} style={styles.backdrop} />
      <View style={styles.sheet}>
        <CharacterDetail view={view} viewer={viewer} player={player} compact={false} />
        <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}>
          <Text style={styles.closeText}>닫기</Text>
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

const styles = StyleSheet.create({
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
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)' },
  sheet: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: 'rgba(22, 14, 7, 0.97)',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.highlight,
    padding: Spacing.three,
    gap: Spacing.two,
    boxShadow: '0 6px 18px rgba(0,0,0,0.5)',
  },
  close: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  closeText: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  body: { gap: Spacing.two },
  top: { flexDirection: 'row', gap: Spacing.two },
  info: { flex: 1, minWidth: 0, gap: 3 },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: Spacing.one },
  name: { color: Colors.text, fontSize: 16, fontWeight: '900', flexShrink: 1 },
  role: { fontSize: 11, fontWeight: '800' },
  character: { color: Colors.text, fontSize: 13, fontWeight: '700' },
  hp: { color: Colors.hp, fontSize: 13, letterSpacing: 1 },
  hpEmpty: { color: Colors.border },
  hpNumber: { color: Colors.text, fontSize: 12, fontWeight: '800', letterSpacing: 0 },
  meta: { color: Colors.textMuted, fontSize: 11 },
  equipment: { color: Colors.deputy, fontSize: 11 },
  ability: { color: Colors.text, fontSize: 13, lineHeight: 19 },
  abilityCompact: { fontSize: 12, lineHeight: 17 },
});
