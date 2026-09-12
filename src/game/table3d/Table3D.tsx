/**
 * 3D 테이블 화면.
 *
 * Canvas(터치 없음) → RN 오버레이(라벨) → 하단 HUD(ActionBar·손패). 텍스트는 전부 RN 이다.
 * GL 이 터지면 markGlFailed 로 2D 로 돌아간다.
 */

import { useLocalSearchParams } from 'expo-router';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { GameState, PlayerId } from '../engine';
import { useGameStore } from '../store/game-store';
import type { CardId } from '../data/types';
import { ActionBar } from '../ui/ActionBar';
import { LogPanel } from '../ui/LogPanel';
import { bottomStatus, handleCardPress, statusMessage } from '../ui/table-text';
import type { TableApi } from '../ui/use-table';
import { Canvas } from './canvas/Canvas';
import { anchorsStore, seatKey } from './core/anchors-store';
import { budgetFor, getDeviceTier } from './core/device-tier';
import { dragStore } from './core/drag-store';
import { startFxBridge } from './core/fx-bridge';
import { FxDemo } from './demo/FxDemo';
import { DragHand } from './drag/DragHand';
import { markGlFailed } from './mode';
import { Overlay3D } from './overlay/Overlay3D';
import { Scene } from './Scene';
import { Colors, MobileBreakpoint, Radius, Spacing } from '@/constants/theme';

const LOG_WIDTH = 268;

export type Table3DProps = {
  view: GameState;
  viewer: PlayerId;
  api: TableApi;
};

export function Table3D({ view, viewer, api }: Table3DProps) {
  const { width } = useWindowDimensions();
  const wide = width >= MobileBreakpoint;
  // 폰의 노치·홈 바를 피한다
  const insets = useSafeAreaInsets();
  // 씬은 가리지 않은 상태를 읽는다. 뒷면만 그리므로 정보는 새지 않는다.
  const state = useGameStore((s) => s.state);
  const [budget] = useState(() => budgetFor(getDeviceTier()));
  const [logOpen, setLogOpen] = useState(false);
  const params = useLocalSearchParams<{ fx?: string }>();
  const demo = __DEV__ && params.fx === 'demo';

  // 전이 → 연출 배치. 3D 가 떠 있는 동안만
  useEffect(() => startFxBridge(() => useGameStore.getState().viewer), []);

  const viewerIndex = view.players.findIndex((p) => p.id === viewer);
  const me = view.players[viewerIndex];
  const targets = api.selected ? api.targetsFor(api.selected) : [];
  const headline = statusMessage(view, viewer);

  const onSeatPress = (pid: PlayerId) => {
    if (api.selected && targets.includes(pid)) api.playCard(api.selected, pid);
  };

  // 제스처의 창 좌표를 캔버스 좌표로 바꾸려면 캔버스가 창 어디에 있는지 알아야 한다
  const tableRef = useRef<View>(null);
  const measureOrigin = () => {
    tableRef.current?.measureInWindow((x, y) => dragStore.setState({ origin: { x, y } }));
  };

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
            headline={headline}
            wide={wide}
          />

          {demo && state && <FxDemo state={state} viewer={viewer} />}

          {!wide && (
            <View style={[styles.topBar, { paddingTop: insets.top + Spacing.one }]}>
              <Text style={styles.headline} numberOfLines={1}>
                {headline}
              </Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="진행 기록"
                onPress={() => setLogOpen((v) => !v)}
                style={styles.logButton}>
                <Text style={styles.logButtonText}>{logOpen ? '닫기' : '기록'}</Text>
              </Pressable>
            </View>
          )}
        </View>

        {wide && <LogPanel log={view.log} style={styles.log} />}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom }]}>
        <ActionBar
          prompt={api.prompt}
          onRespond={api.respond}
          status={bottomStatus(view, viewer, api)}
          canEndTurn={api.canEndTurn}
          onEndTurn={api.endTurn}
          playerNameOf={(pid) => view.players.find((p) => p.id === pid)?.name ?? pid}
          abilities={api.abilities}
          onUseAbility={api.useAbility}
        />
        <View style={styles.handArea}>
          <DragHand
            cards={me.hand}
            playable={api.playable}
            discardable={api.discardable}
            selected={api.selected}
            onSelect={(card) => handleCardPress(api, card)}
            onDragStart={onDragStart}
            onDrop={onDrop}
            showIndex={wide}
          />
        </View>
      </View>

      {!wide && logOpen && (
        <View style={[styles.logOverlay, { top: insets.top + 44 }]}>
          <LogPanel log={view.log} style={styles.logPanel} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="기록 닫기"
            style={styles.logClose}
            onPress={() => setLogOpen(false)}>
            <Text style={styles.logCloseText}>닫기</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

class GlBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(err: unknown) {
    console.warn('3D 테이블을 못 그렸다. 2D 로 돌아간다', err);
    markGlFailed();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  main: { flex: 1, flexDirection: 'row', gap: Spacing.two, padding: Spacing.one },
  tableArea: { flex: 1, position: 'relative', overflow: 'hidden', borderRadius: Radius.lg },
  // 터치는 전부 위의 RN 층이 받는다. 씬은 보기만
  canvasLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none' },
  log: { width: LOG_WIDTH, backgroundColor: 'rgba(28, 19, 11, 0.92)' },
  bottom: { backgroundColor: Colors.surface },
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
  headline: {
    color: Colors.text,
    fontSize: 12,
    fontWeight: '700',
    flexShrink: 1,
    backgroundColor: 'rgba(24, 16, 9, 0.75)',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    overflow: 'hidden',
  },
  logButton: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: 'rgba(24, 16, 9, 0.75)',
  },
  logButtonText: { color: Colors.textMuted, fontSize: 11, fontWeight: '700' },
  logOverlay: {
    position: 'absolute',
    top: 44,
    left: Spacing.two,
    right: Spacing.two,
    bottom: 200,
    gap: Spacing.two,
  },
  logPanel: { flex: 1, backgroundColor: Colors.background, borderColor: Colors.highlight },
  logClose: {
    alignSelf: 'center',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.pill,
    backgroundColor: Colors.cardBrown,
  },
  logCloseText: { color: Colors.paper, fontSize: 12, fontWeight: '800' },
});
