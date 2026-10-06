/**
 * 3D 테이블 화면.
 *
 * Canvas(터치 없음) → RN 오버레이(라벨) → 하단 HUD(ActionBar·손패). 텍스트는 전부 RN 이다.
 * GL 이 터지면 markGlFailed 로 2D 로 돌아간다.
 */

import { useLocalSearchParams } from 'expo-router';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import { useT } from '@/i18n/use-t';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameState, PlayerId } from '../engine';
import { useGameStore } from '../store/game-store';
import type { CardId } from '../data/types';
import { ActionBar } from '../ui/ActionBar';
import { EventAbilityPanel } from '../ui/EventAbilityPanel';
import { GoldPanel } from '../ui/GoldPanel';
import { DraftPanel } from '../ui/DraftPanel';
import { HandFlights } from '../ui/HandFlights';
import { setDeckMeasure } from '../ui/hand-arrival';
import { useChatUnread } from '../ui/ChatPanel';
import { SidePanel } from '../ui/SidePanel';
import { bottomStatus, handleHandTap, statusMessage } from '../ui/table-text';
import { glowingSeat } from '../ui/glowing-seat';
import type { TableApi } from '../ui/use-table';
import { Canvas } from './canvas/Canvas';
import { ANCHOR_DECK, anchorsStore, seatKey } from './core/anchors-store';
import { budgetFor, getDeviceTier } from './core/device-tier';
import { dragStore } from './core/drag-store';
import { startFxBridge } from './core/fx-bridge';
import { FxDemo } from './demo/FxDemo';
import { DragHand } from './drag/DragHand';
import { markGlFailed } from './mode';
import { Overlay3D } from './overlay/Overlay3D';
import { Scene } from './Scene';
import { SelfStatus } from './SelfStatus';
import { WesternFonts } from '../ui/menu/western-fonts';
import { themedStyles } from '../ui/theme/use-theme';
import { Colors, MobileBreakpoint, Radius, Spacing } from '@/constants/theme';
import { useNames } from '@/i18n/use-names';

const LOG_WIDTH = 268;

/**
 * 캔버스는 입력을 받지 않는다 (라벨·손패는 RN 이 받는다). r3f 기본 이벤트 계층을 끈다.
 * 켜 두면 웹에서 GL 이 비동기로 뜨는 사이 Canvas 가 내려갔을 때
 * onCreated 가 null 컨테이너에 addEventListener 를 걸다 터진다 (온라인 판 진입 때 재현).
 */
const noEvents = () => ({ enabled: false, priority: 0 });

export type Table3DProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
  clock?: ReactNode;
};

export function Table3D({ view, viewer, api, clock }: Table3DProps) {
  const styles = useStyles();
  const msgs = useT();
  const names = useNames();
  const t = msgs.infra.table3d;
  const { width } = useWindowDimensions();
  const wide = width >= MobileBreakpoint;
  // 폰의 노치·홈 바를 피한다
  const insets = useSafeAreaInsets();
  // 씬은 가리지 않은 상태를 읽는다. 뒷면만 그리므로 정보는 새지 않는다.
  const state = useGameStore((s) => s.state);
  const [budget] = useState(() => budgetFor(getDeviceTier()));
  const [logOpen, setLogOpen] = useState(false);
  const unread = useChatUnread(logOpen);
  const params = useLocalSearchParams<{ fx?: string }>();
  const demo = __DEV__ && params.fx === 'demo';

  // 전이 → 연출 배치. 3D 가 떠 있는 동안만
  useEffect(() => startFxBridge(() => useGameStore.getState().viewer), []);

  const viewerIndex = view.players.findIndex((p) => p.id === viewer);
  const me = view.players[viewerIndex];
  const targets = api.selected ? api.targetsFor(api.selected) : [];
  const headline = statusMessage(view, viewer, msgs, names);

  const onSeatPress = (pid: PlayerId) => {
    if (api.selected && targets.includes(pid)) api.playCard(api.selected, pid);
  };

  // 제스처의 창 좌표를 캔버스 좌표로 바꾸려면 캔버스가 창 어디에 있는지 알아야 한다
  const tableRef = useRef<View>(null);
  const measureOrigin = () => {
    tableRef.current?.measureInWindow((x, y) => dragStore.setState({ origin: { x, y } }));
  };

  // 새 손패는 3D 덱이 화면에 비친 자리에서부터 날아온다
  useEffect(
    () =>
      setDeckMeasure(
        () =>
          new Promise((resolve) => {
            const table = tableRef.current;
            if (!table) return resolve(null);
            table.measureInWindow((x, y) => {
              const p = anchorsStore.getState().points[ANCHOR_DECK];
              if (!p?.visible) return resolve(null);
              resolve({ x: x + p.x - DECK_SCREEN.w / 2, y: y + p.y - DECK_SCREEN.h / 2, ...DECK_SCREEN });
            });
          }),
      ),
    [],
  );

  const onDragStart = (card: CardId) => {
    if (api.playable.has(card) && api.targetsFor(card).length > 0) api.select(card);
  };

  /** 놓은 자리로 판단한다. 규칙은 전부 TableApi 가 안다 */
  const onDrop = (card: CardId, x: number, y: number): boolean => {
    const { width: cw, height: ch, points } = anchorsStore.getState();
    const onTable = x >= 0 && y >= 0 && x <= cw && y <= ch;
    const done = (played: boolean) => {
      api.select(null);
      return played;
    };
    if (api.discardable.has(card)) {
      if (onTable) api.discard(card);
      return done(onTable);
    }
    if (!api.playable.has(card) || !onTable) return done(false);
    const cardTargets = api.targetsFor(card);
    if (cardTargets.length === 0) {
      api.playCard(card);
      return done(true);
    }
    let best: PlayerId | null = null;
    let bestDist = 120;
    view.players.forEach((p, i) => {
      if (!cardTargets.includes(p.id)) return;
      const pt = points[seatKey(i)];
      if (!pt) return;
      const dist = Math.hypot(pt.x - x, pt.y - y);
      if (dist < bestDist) {
        bestDist = dist;
        best = p.id;
      }
    });
    // 아무 자리 근처도 아니면 대상 없이 낸다 (대상 없이도 낼 수 있는 카드만, 내 자리가 그 표시다)
    if (!best && cardTargets.includes(viewer)) best = viewer;
    if (best) api.playCard(card, best);
    return done(best !== null);
  };

  return (
    <View style={styles.root}>
      <View style={styles.main}>
        <View style={styles.tableArea} ref={tableRef} onLayout={measureOrigin}>
          <View style={styles.canvasLayer}>
            <GlBoundary>
              <Canvas
                events={noEvents}
                frameloop="demand"
                dpr={[1, 2]}
                flat
                gl={{ antialias: budget.antialias, alpha: false, powerPreference: 'high-performance' }}
                camera={{ fov: 45, near: 0.1, far: 100, position: [0, 8, 8] }}
                onCreated={({ gl }) => gl.setClearColor(Colors.background)}>
                {state && (
                  <Scene state={state} viewerIndex={viewerIndex} budget={budget} targets={targets} selected={api.selected} />
                )}
              </Canvas>
            </GlBoundary>
          </View>

          <Overlay3D
            view={view}
            viewer={viewer}
            api={api}
            targets={targets}
            onSeatPress={onSeatPress}
            wide={wide}
          />

          {demo && state && <FxDemo state={state} viewer={viewer} />}

          {!wide && (
            <View style={[styles.topBar, { paddingTop: insets.top + Spacing.one }]}>
              <Text style={styles.headline} numberOfLines={1}>
                {headline}
              </Text>
              <View style={styles.topRight}>
                {clock}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={unread ? t.logA11yUnread : t.logA11y}
                  onPress={() => setLogOpen((v) => !v)}
                  style={styles.logButton}>
                  <Text style={styles.logButtonText}>{logOpen ? t.close : t.logChat}</Text>
                  {unread && <View style={styles.unreadDot} />}
                </Pressable>
              </View>
            </View>
          )}

          {wide && (
            <View style={styles.clockSlot}>
              <Text style={styles.headline} numberOfLines={1}>
                {headline}
              </Text>
              {clock}
            </View>
          )}
        </View>

        {wide && <SidePanel log={view.log} players={view.players} style={styles.side} panelStyle={styles.sidePanel} />}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
        {api.draft ? (
          <DraftPanel draft={api.draft} viewer={viewer} onPick={api.pickCharacter} compact={!wide} />
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
              status={bottomStatus(view, viewer, api, msgs, names)}
              canEndTurn={api.canEndTurn}
              onEndTurn={api.endTurn}
              playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
              abilities={api.abilities}
              onUseAbility={api.useAbility}
              abilityBlocked={api.abilityBlocked}
              playAs={api.playAsAbilities}
              armed={api.armed}
              onArm={api.arm}
              aside={
                <SelfStatus
                  player={me}
                  active={glowingSeat(view) === viewer}
                  targetable={targets.includes(viewer)}
                  onPress={() => onSeatPress(viewer)}
                  compact={!wide}
                />
              }
              stacked={!wide}
            />
            <View style={styles.handArea}>
              <DragHand
                cards={me.hand}
                playable={api.playable}
                discardable={api.discardable}
                selected={api.selected}
                onSelect={(card) => handleHandTap(api, card)}
                onDragStart={onDragStart}
                onDrop={onDrop}
                showIndex={wide}
                owner={viewer}
                resetKey={`${view.turn.round}:${view.turn.active}`}
              />
            </View>
          </>
        )}
      </View>

      {!wide && logOpen && (
        <View style={[styles.logOverlay, { top: insets.top + 44 }]}>
          <SidePanel log={view.log} players={view.players} style={styles.logPanel} panelStyle={styles.logPanelInner} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.logCloseA11y}
            style={styles.logClose}
            onPress={() => setLogOpen(false)}>
            <Text style={styles.logCloseText}>{t.close}</Text>
          </Pressable>
        </View>
      )}
      <HandFlights />
    </View>
  );
}

/** 덱이 화면에 비친 대략의 크기. 날아오는 카드가 이 크기에서 시작해 손패 크기로 커진다 */
const DECK_SCREEN = { w: 48, h: 68 };

class GlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.warn('3D table failed to render; falling back to 2D', err);
    markGlFailed();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

// 판(캔버스 바탕색)은 고정 Colors, 둘레의 막대·패널·알약은 테마를 따른다
const useStyles = themedStyles((c) => ({
  root: { flex: 1, backgroundColor: c.background },
  main: { flex: 1, flexDirection: 'row', gap: Spacing.two, padding: Spacing.one },
  tableArea: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: Radius.lg },
  // 터치는 전부 위의 RN 층이 받는다. 씬은 보기만
  canvasLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  side: { width: LOG_WIDTH },
  sidePanel: {
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    borderRadius: Radius.md,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  // 아래 막대: 손패·행동 버튼이 놓이는 종이(라이트) / 밤 나무(다크) 판
  bottom: {
    backgroundColor: c.surface,
    borderTopWidth: 1.5,
    borderTopColor: c.panelBorder,
    boxShadow: `0 -4px 14px ${c.shadow}`,
  },
  handArea: { height: 132, justifyContent: 'center' },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    pointerEvents: 'box-none',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
    gap: Spacing.two,
  },
  // 어두운 테이블 위에 바로 뜨므로 패널 알약에 담는다 (라이트에서도 읽히게)
  headline: {
    color: c.text,
    fontSize: 12,
    fontWeight: '700',
    fontFamily: WesternFonts.label,
    flexShrink: 1,
    backgroundColor: c.panel,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  logButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    backgroundColor: c.panel,
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  topRight: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  // 넓은 화면: 테이블 오른쪽 위 = 옆 칸(진행 기록) 바로 왼쪽. 차례 안내는 시계 왼쪽에 붙는다
  clockSlot: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    left: Spacing.two,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: Spacing.one,
    pointerEvents: 'none',
  },
  logButtonText: { color: c.text, fontSize: 11, fontWeight: '700', fontFamily: WesternFonts.label },
  unreadDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: c.accent },
  logOverlay: {
    position: 'absolute',
    top: 44,
    left: Spacing.two,
    right: Spacing.two,
    bottom: 200,
    gap: Spacing.two,
  },
  logPanel: { flex: 1 },
  logPanelInner: {
    backgroundColor: c.surface,
    borderWidth: 1.5,
    borderColor: c.selectedBorder,
    borderRadius: Radius.md,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  logClose: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: c.selectedBorder,
    backgroundColor: c.selected,
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  logCloseText: { color: c.onSelected, fontSize: 12, fontWeight: '800', fontFamily: WesternFonts.label },
}));
