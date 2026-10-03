/**
 * 3D 좌석 위에 얹는 RN 라벨. 이름·역할·목숨·손패 장수·거리. 글자는 전부 여기서.
 */

import { Image, Platform, Pressable, Text, View } from 'react-native';

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
import { WesternFonts } from '../../ui/menu/western-fonts';
import { themedStyles, useColors } from '../../ui/theme/use-theme';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { HpPips } from '../../ui/HpPips';

/** 판 팔레트의 역할 색 (테마를 모르는 곳용). 라벨은 테마 팔레트의 c[role] 을 쓴다 */
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
  const styles = useStyles();
  const c = useColors();
  const isSelf = player.id === viewer;
  const presence = usePresence(player.id);
  const presenceText = presence ? ` · ${PRESENCE_LABEL[presence]}` : '';
  const dead = !player.alive && !player.ghost;
  const character = CHARACTERS[player.character];
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;

  // 강탈·캣 벌로우로 고르는 중이면 기존 좌석 컴포넌트를 그대로 띄운다
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
              <Text style={[styles.role, { color: c[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
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
              <Text style={[styles.roleChip, { backgroundColor: c[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
            ) : (
              <Text style={[styles.role, { color: c[player.role] }]}>{ROLE_LABEL[player.role]}</Text>
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
          <View style={styles.hpRow}>
            <HpPips
              hp={Math.max(0, player.hp)}
              maxHp={player.maxHp}
              style={[styles.hp, big && styles.selfHp]}
              emptyStyle={styles.hpEmpty}
            />
            {big && (
              <Text style={styles.selfHpNumber}>
                {Math.max(0, player.hp)}/{player.maxHp}
              </Text>
            )}
          </View>
          {dist !== null && <Text style={styles.meta}>거리 {dist}</Text>}
        </View>
        {player.equipment.length > 0 && (
          <Text style={[styles.equipment, big && styles.selfEquipment]} numberOfLines={big ? 2 : 1}>
            {player.equipment.map((e) => CARD_DEFS[kindOf(e)].nameKo).join(' · ')}
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
  const styles = useStyles();
  const c = useColors();
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
      style={({ pressed }) => [styles.guess, guess && { borderColor: c[guess] }, pressed && styles.guessPressed]}>
      <Text style={[styles.guessText, guess && { color: c[guess] }]}>
        {guess ? `?${ROLE_LABEL[guess]}?` : '???'}
      </Text>
    </Pressable>
  );
}

/** 네모창 윗변에 걸치는 손패 장수. 카드 뒷면 그림 + x8 */
function HandCount({ count }: { count: number }) {
  const styles = useStyles();
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

// 이름표는 어두운 3D 판 위에 얹는 패널이다. 라이트면 종이 패찰, 다크면 밤 나무 패찰
const useStyles = themedStyles((c) => ({
  slot: { position: 'absolute', alignItems: 'center' },
  label: {
    width: '100%',
    backgroundColor: c.panel,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: 1,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  active: { borderColor: c.activeTurn, borderWidth: 2, boxShadow: `0 0 10px ${c.activeTurn}` },
  targetable: { borderColor: c.highlight, borderWidth: 2, boxShadow: `0 0 10px ${c.highlight}` },
  dead: { opacity: 0.45 },
  ghost: { borderColor: c.renegade, borderStyle: 'dashed' },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.one },
  name: { color: c.heading, fontWeight: '800', fontSize: 12, flexShrink: 1, fontFamily: WesternFonts.label },
  role: { fontSize: 9, fontWeight: '800' },
  character: { color: c.textMuted, fontSize: 10 },
  hp: { color: c.hp, fontSize: 10, letterSpacing: 1 },
  hpEmpty: { color: c.rule },
  hpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  meta: { color: c.textMuted, fontSize: 9 },
  guess: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: c.chipBorder,
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  guessPressed: { opacity: 0.6 },
  guessText: { color: c.textMuted, fontSize: 9, fontWeight: '800', opacity: 0.85 },
  equipment: { color: c.deputy, fontSize: 9 },
  detail: { color: c.textMuted, fontSize: 9, lineHeight: 12, fontFamily: WesternFonts.body },
  handCount: {
    position: 'absolute',
    top: -17,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: c.panel,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: c.panelBorder,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  handCountArt: { width: 14, height: 20, borderRadius: 2 },
  // 카드 뒷면 그림이 없을 때 대신 놓는 뒷면 색이라 판 팔레트 고정
  handCountFallback: { backgroundColor: Colors.surfaceRaised },
  handCountText: { color: c.text, fontSize: 11, fontWeight: '800' },
  drafted: { borderColor: c.success },
  selfLabel: {
    borderWidth: 2,
    borderColor: c.hp,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    gap: 3,
  },
  selfName: { fontSize: 18, fontWeight: '900' },
  roleChip: {
    // 역할 색 바탕 위 글자. 다크는 짙은 나무, 라이트는 종이색으로 뒤집힌다
    color: c.background,
    fontSize: 12,
    fontWeight: '900',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    overflow: 'hidden',
  },
  selfCharacter: { fontSize: 14, color: c.text, fontWeight: '700' },
  selfHp: { fontSize: 16, letterSpacing: 2 },
  selfHpNumber: { color: c.text, fontSize: 13, fontWeight: '800', letterSpacing: 0 },
  selfEquipment: { fontSize: 12 },
  selfDetail: { fontSize: 11, lineHeight: 15 },
  draftRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one, minHeight: 18 },
  check: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: c.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: c.onAccent, fontSize: 11, fontWeight: '900', lineHeight: 13 },
  draftDone: { color: c.success, fontSize: 10, fontWeight: '800' },
}));
