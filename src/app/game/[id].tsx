import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AiTier } from '@/game/ai/types';
import { ROLE_LABEL } from '@/game/data/roles';
import { makeView, useGameStore, type SeatSetup } from '@/game/store/game-store';
import { useAiDriver } from '@/game/store/ai-driver';
import { useTimeoutDriver } from '@/game/store/online-driver';
import { useOnlineGameSession, useRoomConnection } from '@/game/store/use-online-game';
import { Table } from '@/game/ui/Table';
import { useHotkeys } from '@/game/ui/use-hotkeys';
import { useTable } from '@/game/ui/use-table';
import { Colors, Radius, Spacing } from '@/constants/theme';

const AI_NAMES = ['보안관보', '건슬링어', '떠돌이', '광부', '바텐더', '현상금꾼', '무법자'];

export default function GameScreen() {
  const params = useLocalSearchParams<{
    id: string;
    players?: string;
    tier?: string;
    highnoon?: string;
    seed?: string;
    /** 1이면 내 자리까지 AI가 두는 관전 모드 */
    auto?: string;
  }>();
  const router = useRouter();

  // id 가 'local' 이면 혼자 하는 판, 아니면 그 값이 곧 방 코드다.
  const online = Boolean(params.id && params.id !== 'local');
  const code = online ? (params.id as string) : null;

  const state = useGameStore((s) => s.state);
  const viewer = useGameStore((s) => s.viewer);
  const controlled = useGameStore((s) => s.controlled);
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);

  const setup = useMemo(() => {
    const players = clamp(Number(params.players ?? 5), 4, 7);
    const tier = (params.tier ?? 'medium') as AiTier;
    const seed = Number(params.seed ?? 1) || 1;
    const highnoon = params.highnoon === '1';
    const seats: SeatSetup[] = Array.from({ length: players }, (_, i) => ({
      id: `p${i}`,
      name: i === 0 ? '나' : AI_NAMES[(i - 1) % AI_NAMES.length],
      human: i === 0,
      tier,
    }));
    return { seed, players, highnoon, seats, auto: params.auto === '1' };
  }, [params.players, params.tier, params.seed, params.highnoon, params.auto]);

  const conn = useRoomConnection(code);
  useOnlineGameSession(code, conn);

  useEffect(() => {
    if (online) return;
    start({
      seed: setup.seed,
      config: {
        playerCount: setup.players,
        expansions: setup.highnoon ? ['highnoon'] : [],
      },
      seats: setup.seats,
      // 관전 모드에서는 아무 자리도 조작하지 않는다. 구동기가 전부 대신 둔다.
      controlled: setup.auto ? [] : ['p0'],
    });
    return () => reset();
  }, [online, setup, start, reset]);

  useAiDriver(true, setup.auto ? 6 : 1);
  useTimeoutDriver(controlled);

  const view = useMemo(() => makeView(state, viewer), [state, viewer]);
  const api = useTable(view, viewer);

  const onPickIndex = useCallback(
    (index: number) => {
      if (!view || !viewer) return;
      // 반응 대기 중이면 프롬프트의 선택지를, 아니면 손패를 고른다.
      if (api.prompt?.cardOptions.length) {
        const card = api.prompt.cardOptions[index];
        if (card) api.respond({ c: 'card', card });
        return;
      }
      const me = view.players.find((p) => p.id === viewer);
      const card = me?.hand[index];
      if (!card) return;
      if (api.discardable.has(card)) {
        api.discard(card);
        return;
      }
      if (!api.playable.has(card)) return;
      const targets = api.targetsFor(card);
      if (targets.length === 0) api.playCard(card);
      else api.select(api.selected === card ? null : card);
    },
    [api, view, viewer],
  );

  useHotkeys({
    onEndTurn: () => {
      if (api.canEndTurn) api.endTurn();
    },
    onPass: () => {
      if (api.prompt?.canPass) api.respond({ c: 'pass' });
    },
    onCancel: () => api.select(null),
    onPickIndex,
  });

  if (!state || !view || !viewer) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.highlight} />
        <Text style={styles.loadingText}>
          {conn.error ?? (online ? '판을 받아오는 중' : '판을 짜는 중')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Table view={view} viewer={viewer} api={api} />

      {online && status !== 'ready' && (
        <View style={styles.connection}>
          <Text style={styles.connectionText}>
            {status === 'connecting' ? '연결하는 중' : '연결이 끊겼다. 다시 붙는 중'}
          </Text>
        </View>
      )}

      {state.result && (
        <View style={styles.overlay}>
          <View style={styles.resultCard}>
            <Text style={styles.resultTitle}>
              {state.result.winners.map((r) => ROLE_LABEL[r]).join('·')} 승리
            </Text>
            <Text style={styles.resultReason}>{state.result.reason}</Text>
            <Text style={styles.resultRoles}>
              {state.players.map((p) => `${p.name} — ${ROLE_LABEL[p.role]}`).join('   ')}
            </Text>
            <View style={styles.resultButtons}>
              <Pressable
                style={styles.resultButton}
                accessibilityRole="button"
                accessibilityLabel="다시 하기"
                onPress={() => router.replace('/local')}>
                <Text style={styles.resultButtonText}>다시 하기</Text>
              </Pressable>
              <Pressable
                style={styles.resultButton}
                accessibilityRole="button"
                accessibilityLabel="처음으로"
                onPress={() => router.replace('/')}>
                <Text style={styles.resultButtonText}>처음으로</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: Colors.background,
  },
  loadingText: { color: Colors.textMuted, fontSize: 13 },
  connection: {
    position: 'absolute',
    top: Spacing.two,
    alignSelf: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  connectionText: { color: Colors.textMuted, fontSize: 11 },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.overlay,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.highlight,
    padding: Spacing.four,
    gap: Spacing.two,
    maxWidth: 560,
  },
  resultTitle: { color: Colors.highlight, fontSize: 26, fontWeight: '900', textAlign: 'center' },
  resultReason: { color: Colors.text, fontSize: 14, textAlign: 'center' },
  resultRoles: { color: Colors.textMuted, fontSize: 11, textAlign: 'center', lineHeight: 18 },
  resultButtons: {
    flexDirection: 'row',
    gap: Spacing.two,
    justifyContent: 'center',
    marginTop: Spacing.two,
  },
  resultButton: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    backgroundColor: Colors.cardBrown,
  },
  resultButtonText: { color: Colors.paper, fontWeight: '800', fontSize: 13 },
});
