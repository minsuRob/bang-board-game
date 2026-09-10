/**
 * 테이블에 앉은 한 사람.
 *
 * 목숨은 총알 개수로, 손패는 뒷면 장수로, 장착 카드는 작은 카드로 보여 준다.
 * 내가 지금 지목할 수 있는 상대는 테두리가 밝아진다
 * (원본 맵 v0.4 "선택 가능한 것들을 강조표시합니다").
 */

import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { CHARACTERS } from '../data/characters';
import { ROLE_LABEL } from '../data/roles';
import type { CardId, Role } from '../data/types';
import type { GameState, Player, PlayerId } from '../engine';
import { distance } from '../engine';
import { characterArt } from './card-art';
import { CardView } from './CardView';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

export type PlayerSeatProps = {
  view: GameState;
  player: Player;
  viewer: PlayerId;
  active: boolean;
  targetable: boolean;
  onPress?: () => void;
  /** 강탈·캣 발루로 상대의 카드를 고르는 중 */
  picking?: { handCount: number; equipment: CardId[] } | null;
  onPickHand?: (index: number) => void;
  onPickEquipment?: (card: CardId) => void;
  compact?: boolean;
};

export function PlayerSeat({
  view,
  player,
  viewer,
  active,
  targetable,
  onPress,
  picking,
  onPickHand,
  onPickEquipment,
  compact,
}: PlayerSeatProps) {
  const isSelf = player.id === viewer;
  const character = CHARACTERS[player.character];
  const dead = !player.alive && !player.ghost;
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;
  // 캐릭터 카드 그림이 설치돼 있으면 초상으로 쓴다. 없으면 이름만 나온다.
  const portrait = characterArt(player.character);

  return (
    <Pressable
      onPress={onPress}
      disabled={!targetable}
      accessibilityRole={targetable ? 'button' : undefined}
      accessibilityLabel={`${player.name} · ${character.nameKo}`}
      style={[
        styles.seat,
        compact && styles.seatCompact,
        active && styles.active,
        targetable && styles.targetable,
        dead && styles.dead,
        player.ghost && styles.ghost,
      ]}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={1}>
          {player.name}
        </Text>
        {player.roleRevealed || isSelf ? (
          <Text style={[styles.role, { color: ROLE_COLOR[player.role] }]}>
            {ROLE_LABEL[player.role]}
          </Text>
        ) : null}
      </View>

      <View style={styles.characterRow}>
        {portrait && (
          <Image source={portrait} style={styles.portrait} resizeMode="cover" />
        )}
        <Text style={styles.character} numberOfLines={2}>
          {character.nameKo}
          {player.ghost ? ' · 유령' : ''}
        </Text>
      </View>

      <View style={styles.row}>
        <Bullets hp={Math.max(0, player.hp)} maxHp={player.maxHp} />
        {dist !== null && <Text style={styles.distance}>거리 {dist}</Text>}
      </View>

      <View style={styles.row}>
        <HandStrip
          count={player.hand.length}
          picking={Boolean(picking)}
          onPick={onPickHand}
        />
        {player.equipment.length > 0 && (
          <View style={styles.equipment}>
            {player.equipment.map((card) => (
              <CardView
                key={card}
                card={card}
                size="sm"
                highlighted={Boolean(picking)}
                onPress={picking && onPickEquipment ? () => onPickEquipment(card) : undefined}
              />
            ))}
          </View>
        )}
      </View>

      {dead && <Text style={styles.deadLabel}>제거됨</Text>}
    </Pressable>
  );
}

function safeDistance(view: GameState, from: PlayerId, to: PlayerId): number | null {
  try {
    return distance(view, from, to);
  } catch {
    return null;
  }
}

function Bullets({ hp, maxHp }: { hp: number; maxHp: number }) {
  return (
    <View style={styles.bullets}>
      {Array.from({ length: maxHp }, (_, i) => (
        <View key={i} style={[styles.bullet, i < hp ? styles.bulletFull : styles.bulletEmpty]} />
      ))}
      <Text style={styles.hpText}>
        {hp}/{maxHp}
      </Text>
    </View>
  );
}

function HandStrip({
  count,
  picking,
  onPick,
}: {
  count: number;
  picking: boolean;
  onPick?: (index: number) => void;
}) {
  if (count === 0) return <Text style={styles.emptyHand}>손패 없음</Text>;
  return (
    <View style={styles.hand}>
      {Array.from({ length: Math.min(count, 8) }, (_, i) => (
        <Pressable
          key={i}
          disabled={!picking}
          onPress={() => onPick?.(i)}
          style={[styles.handCard, picking && styles.handCardPickable]}
        />
      ))}
      <Text style={styles.handCount}>{count}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  seat: {
    // 테이블 질감 위에 얹히므로 불투명해야 글자가 읽힌다
    backgroundColor: 'rgba(38, 26, 15, 0.94)',
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.border,
    padding: Spacing.two,
    gap: Spacing.one,
    minWidth: 156,
    maxWidth: 190,
  },
  seatCompact: { minWidth: 128, maxWidth: 150, padding: Spacing.one },
  active: { borderColor: Colors.sheriff, backgroundColor: 'rgba(64, 46, 27, 0.96)' },
  targetable: {
    borderColor: Colors.highlight,
    boxShadow: `0 0 8px ${Colors.highlight}`,
  },
  dead: { opacity: 0.4 },
  ghost: { borderColor: Colors.renegade, borderStyle: 'dashed' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 4 },
  name: { color: Colors.text, fontWeight: '800', fontSize: 13, flexShrink: 1 },
  role: { fontSize: 10, fontWeight: '800' },
  characterRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  portrait: {
    width: 26,
    height: 36,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  character: { color: Colors.textMuted, fontSize: 11, flexShrink: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  bullets: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  bullet: { width: 7, height: 7, borderRadius: 4 },
  bulletFull: { backgroundColor: Colors.hp },
  bulletEmpty: { backgroundColor: Colors.border },
  hpText: { color: Colors.textMuted, fontSize: 10, marginLeft: 2 },
  distance: { color: Colors.textMuted, fontSize: 10 },
  hand: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  handCard: {
    width: 12,
    height: 18,
    borderRadius: 2,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.cardBrown,
  },
  handCardPickable: { borderColor: Colors.highlight, backgroundColor: Colors.cardBrown },
  handCount: { color: Colors.textMuted, fontSize: 10, marginLeft: 2 },
  emptyHand: { color: Colors.textMuted, fontSize: 10 },
  equipment: { flexDirection: 'row', gap: 2, flexWrap: 'wrap' },
  deadLabel: { color: Colors.danger, fontSize: 10, fontWeight: '800' },
});
