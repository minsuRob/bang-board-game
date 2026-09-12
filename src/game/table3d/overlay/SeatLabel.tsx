/**
 * 3D 좌석 위에 얹는 RN 라벨. 이름·역할·목숨·손패 장수·거리. 글자는 전부 여기서.
 */

import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../../data/cards.base';
import { CHARACTERS } from '../../data/characters';
import { ROLE_GOAL, ROLE_LABEL } from '../../data/roles';
import type { CardId, Role } from '../../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../../engine';
import { PlayerSeat } from '../../ui/PlayerSeat';
import { Colors, Radius, Spacing } from '@/constants/theme';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

export const LABEL_W = 148;
export const LABEL_W_COMPACT = 118;

export type SeatLabelProps = {
  view: GameState;
  player: Player;
  viewer: PlayerId;
  x: number;
  y: number;
  active: boolean;
  targetable: boolean;
  onPress: () => void;
  picking: { handCount: number; equipment: CardId[] } | null;
  onPickHand: (index: number) => void;
  onPickEquipment: (card: CardId) => void;
  /** 넓은 화면에서 내 자리에만 목표·능력을 덧붙인다 */
  detail?: boolean;
  /** 매트가 차지하는 화면 세로 범위 */
  top: number;
  bottom: number;
  /** 매트 위에 붙일지, 아래에 붙일지, 매트 한가운데 얹을지 */
  mode: 'above' | 'below' | 'center';
  /** 좁은 화면: 폭을 줄이고 캐릭터 줄을 뺀다 */
  compact?: boolean;
  canvasHeight: number;
};

export function SeatLabel({
  view,
  player,
  viewer,
  x,
  y,
  active,
  targetable,
  onPress,
  picking,
  onPickHand,
  onPickEquipment,
  detail,
  top,
  bottom,
  mode,
  compact,
  canvasHeight,
}: SeatLabelProps) {
  const isSelf = player.id === viewer;
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;

  // 강탈·캣 발루로 고르는 중이면 기존 좌석 컴포넌트를 그대로 띄운다
  if (picking) {
    return (
      <View style={[styles.slot, { left: x - 90, top: y - 60, width: 180 }]}>
        <PlayerSeat
          view={view}
          player={player}
          viewer={viewer}
          active={active}
          targetable={targetable}
          onPress={onPress}
          picking={picking}
          onPickHand={onPickHand}
          onPickEquipment={onPickEquipment}
          compact
        />
      </View>
    );
  }

  const place =
    mode === 'above'
      ? { bottom: canvasHeight - top + 2 }
      : mode === 'below'
        ? { top: bottom + 2 }
        : { top: Math.max(0, y - 30) };

  const w = compact ? LABEL_W_COMPACT : LABEL_W;

  return (
    <View style={[styles.slot, { left: x - w / 2, width: w }, place]}>
      <Pressable
        onPress={onPress}
        disabled={!targetable}
        accessibilityRole={targetable ? 'button' : undefined}
        accessibilityLabel={`${player.name} · ${character.nameKo}`}
        style={[
          styles.label,
          active && styles.active,
          targetable && styles.targetable,
          dead && styles.dead,
          player.ghost && styles.ghost,
        ]}>
        <View style={styles.row}>
          <Text style={styles.name} numberOfLines={1}>
            {player.name}
          </Text>
          {(player.roleRevealed || isSelf) && (
            <Text style={[styles.role, { color: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
          )}
        </View>
        {(!compact || player.ghost || dead) && (
          <Text style={styles.character} numberOfLines={1}>
            {character.nameKo}
            {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
          </Text>
        )}
        <View style={styles.row}>
          <Text style={styles.hp}>
            {'●'.repeat(Math.max(0, player.hp))}
            <Text style={styles.hpEmpty}>{'○'.repeat(Math.max(0, player.maxHp - Math.max(0, player.hp)))}</Text>
          </Text>
          {!isSelf && <Text style={styles.meta}>손패 {player.hand.length}</Text>}
          {dist !== null && <Text style={styles.meta}>거리 {dist}</Text>}
        </View>
        {player.equipment.length > 0 && (
          <Text style={styles.equipment} numberOfLines={1}>
            {player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ')}
          </Text>
        )}
        {detail && isSelf && (
          <Text style={styles.detail} numberOfLines={3}>
            {ROLE_GOAL[player.role]} · {character.ability}
          </Text>
        )}
      </Pressable>
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
  slot: { position: 'absolute', alignItems: 'center' },
  label: {
    width: '100%',
    backgroundColor: 'rgba(30, 20, 11, 0.9)',
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: 1,
  },
  active: { borderColor: Colors.sheriff, backgroundColor: 'rgba(58, 40, 20, 0.94)' },
  targetable: { borderColor: Colors.highlight, borderWidth: 2, boxShadow: `0 0 10px ${Colors.highlight}` },
  dead: { opacity: 0.45 },
  ghost: { borderColor: Colors.renegade, borderStyle: 'dashed' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  name: { color: Colors.text, fontWeight: '800', fontSize: 12, flexShrink: 1 },
  role: { fontSize: 9, fontWeight: '800' },
  character: { color: Colors.textMuted, fontSize: 10 },
  hp: { color: Colors.hp, fontSize: 10, letterSpacing: 1 },
  hpEmpty: { color: Colors.border },
  meta: { color: Colors.textMuted, fontSize: 9 },
  equipment: { color: Colors.deputy, fontSize: 9 },
  detail: { color: Colors.textMuted, fontSize: 9, lineHeight: 12 },
});
