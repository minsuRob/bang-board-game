/**
 * 3D 좌석 위에 얹는 RN 라벨. 이름·역할·목숨·손패 장수·거리. 글자는 전부 여기서.
 */

import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CARD_DEFS } from '../../data/cards.base';
import { CHARACTERS } from '../../data/characters';
import { ROLE_GOAL, ROLE_LABEL } from '../../data/roles';
import type { CardId, Role } from '../../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../../engine';
import { usePresence } from '../../store/presence';
import { cycleRoleGuess, useRoleGuess } from '../../store/role-guess';
import { AttackBadges } from '../../ui/AttackBadges';
import { cardBackArt } from '../../ui/card-art';
import { PlayerSeat } from '../../ui/PlayerSeat';
import { PRESENCE_LABEL, PresenceDot } from '../../ui/PresenceDot';
import { Colors, Radius, Spacing } from '@/constants/theme';

export const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

export const LABEL_W = 148;
export const LABEL_W_COMPACT = 118;
/** 내 정보창. 보드 옆에 크게 */
export const LABEL_W_SELF = 220;
export const LABEL_W_SELF_COMPACT = 180;

export type SeatLabelProps = {
  view: GameState;
  player: Player;
  viewer: PlayerId;
  x: number;
  y: number;
  active: boolean;
  targetable: boolean;
  /** 겨눌 수 있으면 카드를 내고, 아니면 상세를 연다 */
  onPress: () => void;
  picking: { handCount: number; equipment: CardId[] } | null;
  onPickHand: (index: number) => void;
  onPickEquipment: (card: CardId) => void;
  /** 넓은 화면에서 내 자리에만 목표·능력을 덧붙인다 */
  detail?: boolean;
  /** 보드가 차지하는 화면 세로 범위 */
  top: number;
  bottom: number;
  /**
   * 보드 위에 붙일지, 아래에 붙일지, 옆(x 가 창의 가운데)에 아랫변을 맞춰 붙일지,
   * 보드 아랫변 안쪽에 얹을지(좁은 화면의 내 자리)
   */
  mode: 'above' | 'below' | 'side' | 'inside';
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
  const presence = usePresence(player.id);
  const presenceText = presence ? ` · ${PRESENCE_LABEL[presence]}` : '';
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
        : // 옆·안쪽: 보드 아랫변에 바닥을 맞추고 위로 자란다. 캔버스 아래로 넘치지 않는다
          { bottom: Math.max(4, canvasHeight - bottom + (mode === 'inside' ? 4 : 0)) };

  const w = isSelf ? (compact ? LABEL_W_SELF_COMPACT : LABEL_W_SELF) : compact ? LABEL_W_COMPACT : LABEL_W;
  const big = isSelf;

  // 캐릭터 드래프트 중: 캐릭터·목숨은 아직 없다. 골랐는지만 보인다
  if (view.draft) {
    const done = view.draft.picked[player.id] !== null;
    return (
      <View style={[styles.slot, { left: x - w / 2, width: w }, place]}>
        <View
          accessibilityLabel={`${player.name}${presenceText} · ${done ? '선택 완료' : '고르는 중'}`}
          style={[styles.label, done && styles.drafted]}>
          <View style={styles.row}>
            <PresenceDot presence={presence} />
            <Text style={styles.name} numberOfLines={1}>
              {player.name}
            </Text>
            {(player.roleRevealed || isSelf) && (
              <Text style={[styles.role, { color: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            )}
          </View>
          <View style={styles.draftRow}>
            {done ? (
              <>
                <View style={styles.check}>
                  <Text style={styles.checkText}>✓</Text>
                </View>
                <Text style={styles.draftDone}>선택 완료</Text>
              </>
            ) : (
              <Text style={styles.character}>캐릭터 고르는 중…</Text>
            )}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.slot, { left: x - w / 2, width: w }, place]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${player.name}${presenceText} · ${character.nameKo}${targetable ? '' : ' 상세 보기'}`}
        style={[
          styles.label,
          big && styles.selfLabel,
          active && styles.active,
          targetable && styles.targetable,
          dead && styles.dead,
          player.ghost && styles.ghost,
        ]}>
        {!isSelf && <HandCount count={player.hand.length} />}
        <View style={styles.row}>
          <PresenceDot presence={presence} size={big ? 10 : 8} />
          <Text style={[styles.name, big && styles.selfName]} numberOfLines={1}>
            {player.name}
          </Text>
          {!isSelf && <AttackBadges view={view} from={player.id} viewer={viewer} />}
          {(player.roleRevealed || isSelf) &&
            (big ? (
              <Text style={[styles.roleChip, { backgroundColor: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            ) : (
              <Text style={[styles.role, { color: ROLE_COLOR[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            ))}
          {!player.roleRevealed && !isSelf && !dead && (
            <RoleGuess pid={player.id} playerCount={view.players.length} />
          )}
        </View>
        {(!compact || big || player.ghost || dead) && (
          <Text style={[styles.character, big && styles.selfCharacter]} numberOfLines={1}>
            {character.nameKo}
            {player.ghost ? ' · 유령' : dead ? ' · 제거됨' : ''}
          </Text>
        )}
        <View style={styles.row}>
          <Text style={[styles.hp, big && styles.selfHp]}>
            {'●'.repeat(Math.max(0, player.hp))}
            <Text style={styles.hpEmpty}>{'○'.repeat(Math.max(0, player.maxHp - Math.max(0, player.hp)))}</Text>
            {big && (
              <Text style={styles.selfHpNumber}>
                {'  '}
                {Math.max(0, player.hp)}/{player.maxHp}
              </Text>
            )}
          </Text>
          {dist !== null && <Text style={styles.meta}>거리 {dist}</Text>}
        </View>
        {player.equipment.length > 0 && (
          <Text style={[styles.equipment, big && styles.selfEquipment]} numberOfLines={big ? 2 : 1}>
            {player.equipment.map((c) => CARD_DEFS[kindOf(c)].nameKo).join(' · ')}
          </Text>
        )}
        {isSelf && (
          <Text style={[styles.detail, styles.selfDetail]} numberOfLines={detail ? 4 : compact ? 1 : 2}>
            {ROLE_GOAL[player.role]} · {character.ability}
          </Text>
        )}
      </Pressable>
    </View>
  );
}

/** 숨은 직업 자리. 탭할 때마다 ??? → ?무법자? → … 로 짐작을 바꾼다. 나만 보인다 */
function RoleGuess({ pid, playerCount }: { pid: PlayerId; playerCount: number }) {
  const guess = useRoleGuess(pid);
  return (
    <Pressable
      onPress={(e) => {
        e.stopPropagation();
        cycleRoleGuess(pid, playerCount);
      }}
      hitSlop={6}
      // 웹에서 button 역할을 주면 라벨의 <button> 안에 <button> 이 들어가 경고가 난다
      accessibilityRole={Platform.OS === 'web' ? undefined : 'button'}
      accessibilityLabel={guess ? `직업 짐작: ${ROLE_LABEL[guess]}. 눌러서 바꾸기` : '직업 짐작하기'}
      style={({ pressed }) => [styles.guess, guess && { borderColor: ROLE_COLOR[guess] }, pressed && styles.guessPressed]}>
      <Text style={[styles.guessText, guess && { color: ROLE_COLOR[guess] }]}>
        {guess ? `?${ROLE_LABEL[guess]}?` : '???'}
      </Text>
    </Pressable>
  );
}

/** 네모창 윗변에 걸치는 손패 장수. 카드 뒷면 그림 + x8 */
function HandCount({ count }: { count: number }) {
  const art = cardBackArt();
  return (
    <View style={styles.handCount} accessibilityLabel={`손패 ${count}장`} pointerEvents="none">
      {art ? (
        <Image source={art} style={styles.handCountArt} resizeMode="cover" />
      ) : (
        <View style={[styles.handCountArt, styles.handCountFallback]} />
      )}
      <Text style={styles.handCountText}>x{count}</Text>
    </View>
  );
}

export function safeDistance(view: GameState, from: PlayerId, to: PlayerId): number | null {
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
  active: { borderColor: Colors.activeTurn, backgroundColor: 'rgba(26, 44, 24, 0.94)' },
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
  guess: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: Colors.border,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  guessPressed: { opacity: 0.6 },
  guessText: { color: Colors.textMuted, fontSize: 9, fontWeight: '800', opacity: 0.85 },
  equipment: { color: Colors.deputy, fontSize: 9 },
  detail: { color: Colors.textMuted, fontSize: 9, lineHeight: 12 },
  handCount: {
    position: 'absolute',
    top: -17,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(30, 20, 11, 0.95)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  handCountArt: { width: 14, height: 20, borderRadius: 2 },
  handCountFallback: { backgroundColor: Colors.surfaceRaised },
  handCountText: { color: Colors.text, fontSize: 11, fontWeight: '800' },
  drafted: { borderColor: Colors.success },
  selfLabel: {
    backgroundColor: 'rgba(22, 14, 7, 0.94)',
    borderWidth: 2,
    borderColor: Colors.hp,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 3,
  },
  selfName: { fontSize: 18, fontWeight: '900' },
  roleChip: {
    color: '#1A120A',
    fontSize: 12,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  selfCharacter: { fontSize: 14, color: Colors.text, fontWeight: '700' },
  selfHp: { fontSize: 16, letterSpacing: 2 },
  selfHpNumber: { color: Colors.text, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  selfEquipment: { fontSize: 12 },
  selfDetail: { fontSize: 11, lineHeight: 15 },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, minHeight: 18 },
  check: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 11, fontWeight: '900', lineHeight: 13 },
  draftDone: { color: Colors.success, fontSize: 10, fontWeight: '800' },
});
