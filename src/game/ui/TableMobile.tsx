/**
 * 좁은 화면용 테이블.
 *
 * 원형 배치는 손가락으로 쓰기에 너무 촘촘하고, 세로 화면에서는 좌석이 겹친다.
 * 그래서 모바일에서는 원을 버리고 위에서 아래로 쌓는다.
 * 착석 순서는 그대로 유지해서 거리 감각은 잃지 않게 한다.
 */

import { useRef, useState, type ReactNode } from 'react';
import {
  Image,
  ImageBackground,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { CARD_DEFS } from '../data/cards.base';
import { EVENTS } from '../data/events';
import { CHARACTERS } from '../data/characters';
import type { DimensionValue } from 'react-native';

import type { CardId, Role } from '../data/types';
import { distance, kindOf, type GameState, type Player, type PlayerId } from '../engine';
import { usePresence } from '../store/presence';
import { ActionBar } from './ActionBar';
import { EventAbilityPanel } from './EventAbilityPanel';
import { GoldPanel } from './GoldPanel';
import { DraftPanel } from './DraftPanel';
import { CharacterDetailModal } from './CharacterDetail';
import { PlayedCardSpotlight } from './PlayedCardSpotlight';
import { PresenceDot } from './PresenceDot';
import { DraftSeatStatus } from './DraftSeatStatus';
import { cardBackArt, characterArt, eventArt, woodArt } from './card-art';
import { AttackBadges } from './AttackBadges';
import { CardView } from './CardView';
import { CharacterPortraitImage } from './CharacterPortraitImage';
import { Hand } from './Hand';
import { HandFlights, useDeckAnchor } from './HandFlights';
import { useChatUnread } from './ChatPanel';
import { SidePanel } from './SidePanel';
import { WesternFonts } from './menu/western-fonts';
import { useToolbarStyles } from './theme/toolbar';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { glowingSeat } from './glowing-seat';
import type { TableApi } from './use-table';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { HpPips } from './HpPips';
import { useNames } from '../../i18n/use-names';

const ROLE_COLOR: Record<Role, string> = {
  sheriff: Colors.sheriff,
  deputy: Colors.deputy,
  outlaw: Colors.outlaw,
  renegade: Colors.renegade,
};

export type TableMobileProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  status: string;
  headline: string;
  onSeatPress: (pid: PlayerId) => void;
  targets: PlayerId[];
  onCardPress: (card: CardId) => void;
  /** 진행 기록 버튼 왼쪽에 붙는 시계 */
  clock?: ReactNode;
};

export function TableMobile({
  view,
  viewer,
  api,
  status,
  headline,
  onSeatPress,
  targets,
  onCardPress,
  clock,
}: TableMobileProps) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const tb = useToolbarStyles();
  const [logOpen, setLogOpen] = useState(false);
  // 탭해서 띄운 캐릭터 카드와 상세 설명
  const [detail, setDetail] = useState<PlayerId | null>(null);
  const unread = useChatUnread(logOpen);
  const { width, height } = useWindowDimensions();
  // 폭이 넓으면 좌석을 여러 열로 늘어놓는다. 폰을 눕혔을 때가 이 경우다.
  const columns = width >= 900 ? 4 : width >= 520 ? 3 : 2;
  const seatBasis: DimensionValue = `${Math.floor(100 / columns) - 2}%`;
  // 높이가 아주 낮으면(가로로 누운 폰) 내 자리와 손패를 나란히 둔다.
  const squat = height < 480;

  const me = view.players.find((p) => p.id === viewer)!;
  const others = orderedOthers(view, viewer);
  const steal = api.prompt?.steal ?? null;
  const detailPlayer = (!view.draft && view.players.find((p) => p.id === detail)) || null;
  // 겨눌 수 있으면 카드를 내고, 아니면 상세를 연다. 카드를 고르는 중에는 안쪽 칸이 받는다
  const pressSeat = (pid: PlayerId) => {
    if (targets.includes(pid)) {
      onSeatPress(pid);
      return;
    }
    if (!(steal && steal.target === pid)) setDetail(pid);
  };
  const top = view.discard[view.discard.length - 1];
  const event = view.event?.current ? EVENTS[view.event.current] : null;
  const eventImage = view.event?.current ? eventArt(view.event.current) : null;
  const back = cardBackArt();
  const deck = useRef<View>(null);
  useDeckAnchor(deck);
  const wood = woodArt();

  return (
    <View style={styles.root}>
      {wood && (
        <ImageBackground
          source={wood}
          style={styles.woodBackdrop}
          imageStyle={styles.woodImage}
        />
      )}
      <View style={styles.topBar}>
        <Text style={styles.headline} numberOfLines={1}>
          {headline}
        </Text>
        <View style={styles.topRight}>
          {clock}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={unread ? t.ui.mobile.logChatNew : t.ui.mobile.logChat}
            onPress={() => setLogOpen((v) => !v)}
            style={[tb.pill, logOpen && tb.pillActive]}>
            <Text style={[tb.text, logOpen && tb.textActive]}>{logOpen ? t.ui.mobile.close : t.ui.mobile.logTab}</Text>
            {unread && <View style={styles.unreadDot} />}
          </Pressable>
        </View>
      </View>

      <View style={styles.scrollArea}>
        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.seatGrid}>
            {others.map((player) => (
              <CompactSeat
                key={player.id}
                basis={seatBasis}
                view={view}
                viewer={viewer}
                player={player}
                active={glowingSeat(view) === player.id}
                targetable={targets.includes(player.id)}
                onPress={() => pressSeat(player.id)}
                picking={steal && steal.target === player.id ? steal : null}
                onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
                onPickEquipment={(card) => api.respond({ c: 'pick', pick: { zone: 'equipment', card } })}
              />
            ))}
          </View>

          <View style={styles.center}>
            <Pile label={t.ui.pile.deck(view.deck.length)}>
              <View ref={deck} collapsable={false}>
                {back ? (
                  <Image source={back} style={styles.cardBackArt} resizeMode="cover" />
                ) : (
                  <View style={styles.cardBack}>
                    <Text style={styles.cardBackMark}>✷</Text>
                  </View>
                )}
              </View>
            </Pile>
            <Pile label={t.ui.pile.discard(view.discard.length)}>
              {top ? <CardView card={top} size="sm" /> : <View style={styles.emptyPile} />}
            </Pile>
            {event && (
              <Pile label={t.ui.pile.event}>
                {eventImage ? (
                  <Image source={eventImage} style={styles.eventArt} resizeMode="cover" />
                ) : (
                  <View style={styles.eventCard}>
                    <Text style={styles.eventName} numberOfLines={2}>
                      {names.eventName(event.id)}
                    </Text>
                  </View>
                )}
              </Pile>
            )}
          </View>
        </ScrollView>
        <PlayedCardSpotlight view={view} viewer={viewer} api={api} compact />
      </View>

      {api.draft ? (
        <DraftPanel draft={api.draft} viewer={viewer} onPick={api.pickCharacter} compact />
      ) : (
        <>
          {view.gold ? (
            <GoldPanel
              view={view}
              viewer={viewer}
              actions={api.goldActions}
              send={api.sendGold}
              prompt={api.prompt}
              respond={api.respond}
            />
          ) : null}
          <EventAbilityPanel view={view} viewer={viewer} actions={api.eventActions} send={api.sendGold} />
          <ActionBar
            prompt={api.prompt}
            onRespond={api.respond}
            status={status}
            canEndTurn={api.canEndTurn}
            onEndTurn={api.endTurn}
            playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
            abilities={api.abilities}
            onUseAbility={api.useAbility}
            abilityBlocked={api.abilityBlocked}
            playAs={api.playAsAbilities}
            armed={api.armed}
            onArm={api.arm}
          />

          <View style={[styles.mine, squat && styles.mineRow]}>
            <CompactSeat
              view={view}
              viewer={viewer}
              player={me}
              active={glowingSeat(view) === viewer}
              targetable={targets.includes(viewer)}
              onPress={() => pressSeat(viewer)}
              picking={steal && steal.target === viewer ? steal : null}
              onPickHand={(index) => api.respond({ c: 'pick', pick: { zone: 'hand', index } })}
              onPickEquipment={(card) => api.respond({ c: 'pick', pick: { zone: 'equipment', card } })}
              wide={!squat}
              basis={squat ? 220 : undefined}
            />
            <View style={[styles.handArea, squat && styles.handAreaSquat]}>
              <Hand
                cards={me.hand}
                playable={api.playable}
                discardable={api.discardable}
                selected={api.selected}
                onSelect={onCardPress}
                owner={viewer}
                resetKey={`${view.turn.round}:${view.turn.active}`}
              />
            </View>
          </View>
        </>
      )}

      {detailPlayer && (
        <CharacterDetailModal view={view} viewer={viewer} player={detailPlayer} onClose={() => setDetail(null)} />
      )}

      {logOpen && (
        <View style={styles.logOverlay}>
          <SidePanel log={view.log} style={styles.logPanel} panelStyle={styles.logPanelInner} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.ui.mobile.closeLog}
            style={[tb.pill, styles.logClose]}
            onPress={() => setLogOpen(false)}>
            <Text style={tb.text}>{t.ui.mobile.close}</Text>
          </Pressable>
        </View>
      )}
      <HandFlights />
    </View>
  );
}

/** 나를 뺀 나머지를, 내 왼쪽부터 착석 순서대로 */
function orderedOthers(view: GameState, viewer: PlayerId): Player[] {
  const n = view.players.length;
  const start = view.players.findIndex((p) => p.id === viewer);
  const out: Player[] = [];
  for (let i = 1; i < n; i++) out.push(view.players[(start + i) % n]);
  return out;
}

type CompactSeatProps = {
  view: GameState;
  viewer: PlayerId;
  player: Player;
  active: boolean;
  targetable: boolean;
  onPress: () => void;
  picking: { handCount: number; equipment: CardId[] } | null;
  onPickHand: (index: number) => void;
  onPickEquipment: (card: CardId) => void;
  wide?: boolean;
  /** 한 줄에 몇 칸을 차지할지 (flexBasis) */
  basis?: DimensionValue;
};

function CompactSeat({
  view,
  viewer,
  player,
  active,
  targetable,
  onPress,
  picking,
  onPickHand,
  onPickEquipment,
  wide,
  basis,
}: CompactSeatProps) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const isSelf = player.id === viewer;
  const dead = !player.alive && !player.ghost;
  const dist = !isSelf && !dead ? safeDistance(view, viewer, player.id) : null;
  const portrait = characterArt(player.character);
  const presence = usePresence(player.id);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${player.name}${presence ? ` · ${t.ui.presence[presence]}` : ''} · ${names.charName(player.character)}${targetable || view.draft ? '' : t.ui.mobile.detail}`}
      style={[
        styles.compact,
        basis ? { flexBasis: basis } : null,
        wide && styles.compactWide,
        active && styles.compactActive,
        targetable && styles.compactTargetable,
        dead && styles.compactDead,
        player.ghost && styles.compactGhost,
      ]}>
      <View style={styles.compactRow}>
        <PresenceDot presence={presence} />
        <Text style={styles.compactName} numberOfLines={1}>
          {player.name}
        </Text>
        {!isSelf && !view.draft && <AttackBadges view={view} from={player.id} viewer={viewer} />}
        {(player.roleRevealed || isSelf) && (
          <Text style={[styles.compactRole, { color: ROLE_COLOR[player.role] }]}>
            {names.roleName(player.role)}
          </Text>
        )}
      </View>

      {view.draft ? (
        <DraftSeatStatus view={view} pid={player.id} isSelf={isSelf} />
      ) : (
        <>
          <View style={styles.compactCharRow}>
            {portrait && (
              <View style={styles.compactPortrait}>
                <CharacterPortraitImage id={player.character} width={20} height={28} />
              </View>
            )}
            <Text style={styles.compactCharacter} numberOfLines={2}>
              {names.charName(player.character)}
              {player.ghost ? t.ui.seat.ghost : ''}
              {dead ? t.ui.character.removed : ''}
            </Text>
          </View>

          <View style={styles.compactRow}>
            <HpPips
              hp={Math.max(0, player.hp)}
              maxHp={player.maxHp}
              style={styles.compactHp}
              emptyStyle={styles.compactHpEmpty}
            />
            {dist !== null && <Text style={styles.compactMeta}>{t.ui.seat.distance(dist)}</Text>}
          </View>
        </>
      )}

      <View style={styles.compactRow}>
        <View style={styles.compactHand}>
          {Array.from({ length: Math.min(player.hand.length, 6) }, (_, i) => (
            <Pressable
              key={i}
              disabled={!picking}
              onPress={() => onPickHand(i)}
              style={[styles.compactCard, picking && styles.compactCardPickable]}
            />
          ))}
          <Text style={styles.compactMeta}>{player.hand.length}</Text>
        </View>

        {player.equipment.map((card) => (
          <Pressable
            key={card}
            disabled={!picking}
            onPress={() => onPickEquipment(card)}
            style={[styles.equipChip, picking && styles.equipChipPickable]}>
            <Text style={styles.equipText} numberOfLines={1}>
              {names.cardName(kindOf(card))}
            </Text>
          </Pressable>
        ))}
      </View>
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

function Pile({ label, children }: { label: string; children: React.ReactNode }) {
  const styles = useStyles();
  return (
    <View style={styles.pile}>
      {children}
      <Text style={styles.pileLabel}>{label}</Text>
    </View>
  );
}

// 좌석·더미·나무 바탕은 판이라 고정 Colors. 위 막대, 아래 내 자리 막대, 기록 창은 테마 팔레트를 따른다
const useStyles = themedStyles((c) => ({
  scrollArea: { flex: 1 },
  root: { flex: 1, backgroundColor: Colors.background },
  woodBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // 배경일 뿐이므로 손가락을 가로막지 않는다
    pointerEvents: 'none',
  },
  woodImage: { resizeMode: 'repeat', opacity: 0.35 },
  cardBackArt: { width: 46, height: 66, borderRadius: Radius.md },
  eventArt: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    backgroundColor: c.surface,
    borderBottomWidth: 1.5,
    borderBottomColor: c.panelBorder,
    boxShadow: `0 4px 14px ${c.shadow}`,
    gap: Spacing.two,
    zIndex: 1,
  },
  headline: { color: c.heading, fontSize: 13, fontWeight: '700', flexShrink: 1, fontFamily: WesternFonts.label },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },

  body: { padding: Spacing.two, gap: Spacing.two },
  seatGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.two },
  center: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
  },
  pile: { alignItems: 'center', gap: 2 },
  pileLabel: { color: Colors.textMuted, fontSize: 9 },
  cardBack: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBackMark: { color: Colors.cardBrown, fontSize: 16 },
  emptyPile: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.border,
    borderStyle: 'dashed',
  },
  eventCard: {
    width: 46,
    height: 66,
    borderRadius: Radius.md,
    borderWidth: 2,
    borderColor: Colors.renegade,
    backgroundColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 2,
  },
  eventName: { color: Colors.textOnPaper, fontSize: 9, fontWeight: '800', textAlign: 'center' },

  compact: {
    flexGrow: 1,
    flexBasis: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.two,
    gap: 2,
  },
  // 내 자리는 한 줄을 다 쓰되 세로로 늘어나지는 않는다 (손패 자리를 먹는다)
  compactWide: { flexBasis: 'auto', flexGrow: 0, width: '100%' },
  compactActive: { borderColor: Colors.activeTurn, backgroundColor: Colors.surfaceRaised },
  compactTargetable: { borderColor: Colors.highlight, borderWidth: 2 },
  compactDead: { opacity: 0.45 },
  compactGhost: { borderColor: Colors.renegade, borderStyle: 'dashed' },
  compactRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, flexWrap: 'wrap' },
  compactName: { color: Colors.text, fontSize: 12, fontWeight: '800', flexShrink: 1 },
  compactRole: { fontSize: 9, fontWeight: '800' },
  compactCharRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  compactPortrait: { width: 20, height: 28, borderRadius: 2, overflow: 'hidden' },
  compactCharacter: { color: Colors.textMuted, fontSize: 10, flexShrink: 1 },
  compactHp: { color: Colors.hp, fontSize: 10, letterSpacing: 1 },
  compactHpEmpty: { color: Colors.border },
  compactMeta: { color: Colors.textMuted, fontSize: 9 },
  compactHand: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  compactCard: {
    width: 9,
    height: 14,
    borderRadius: 2,
    backgroundColor: Colors.surfaceRaised,
    borderWidth: 1,
    borderColor: Colors.cardBrown,
  },
  compactCardPickable: { borderColor: Colors.highlight, backgroundColor: Colors.cardBrown },
  equipChip: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.cardBlue,
  },
  equipChipPickable: { borderColor: Colors.highlight, backgroundColor: Colors.surfaceRaised },
  equipText: { color: Colors.deputy, fontSize: 9 },

  mineRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  mine: {
    backgroundColor: c.surface,
    borderTopWidth: 1.5,
    borderTopColor: c.panelBorder,
    boxShadow: `0 -4px 14px ${c.shadow}`,
    paddingTop: Spacing.two,
    paddingBottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.one,
  },
  // 가로 스크롤은 높이를 스스로 정하지 못한다. 카드 한 장 높이만큼 잡아 준다.
  handArea: { height: 128, justifyContent: 'center' },
  handAreaSquat: { flex: 1, height: 124 },

  logOverlay: {
    position: 'absolute',
    top: 44,
    left: Spacing.two,
    right: Spacing.two,
    bottom: 120,
    gap: Spacing.two,
  },
  logPanel: { flex: 1 },
  logPanelInner: {
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  logClose: { alignSelf: 'center', paddingHorizontal: Spacing.four, minHeight: 34 },
}));
