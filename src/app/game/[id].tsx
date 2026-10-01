import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AiSpeed, AiTier } from '@/game/ai/types';
import { setAiSpeed } from '@/firebase/rooms';
import { ROLE_LABEL } from '@/game/data/roles';
import { makeView, useGameStore, type SeatSetup } from '@/game/store/game-store';
import { useAiDriver } from '@/game/store/ai-driver';
import {
  canSaveGame,
  getSaveBackend,
  makeSaveRecord,
  newSaveId,
  readSaveRecord,
  SaveError,
  type SavedGame,
  type SaveRecord,
} from '@/game/save';
import { useTimeoutDriver } from '@/game/store/online-driver';
import { useChat } from '@/game/store/use-chat';
import { useOnlineGameSession, useRoomConnection } from '@/game/store/use-online-game';
import { preloadArt, useArtProgress, useArtReady } from '@/game/ui/art-preload';
import { GameClock, useStopwatch } from '@/game/ui/GameClock';
import { FullscreenButton } from '@/game/ui/FullscreenButton';
import { PauseButton } from '@/game/ui/PauseButton';
import { SaveButton, SaveNotice, type SaveStatus } from '@/game/ui/SaveButton';
import { SoundButton } from '@/game/ui/SoundButton';
import { SpeedControl } from '@/game/ui/SpeedControl';
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
    /** 1이면 그림자의 계곡 카드·캐릭터를 섞는다 */
    valley?: string;
    goldrush?: string;
    seed?: string;
    /** 1이면 내 자리까지 AI가 두는 관전 모드 */
    auto?: string;
    /** 저장한 판 id. 있으면 그 판을 이어 본다 (다른 설정 값은 무시) */
    save?: string;
  }>();
  const router = useRouter();

  // id 가 'local' 이면 혼자 하는 판, 아니면 그 값이 곧 방 코드다.
  const online = Boolean(params.id && params.id !== 'local');
  const code = online ? (params.id as string) : null;

  // 이어 볼 저장본. 불러온 결과를 id 와 함께 두고, 지금 id 와 맞을 때만 쓴다
  const saveParam = !online && params.save ? params.save : null;
  const [loaded, setLoaded] = useState<{ id: string; game?: SavedGame; error?: string } | null>(
    null,
  );
  const current = saveParam && loaded?.id === saveParam ? loaded : null;
  const resumed = current?.game ?? null;
  const resumeError = current?.error ?? null;
  useEffect(() => {
    if (!saveParam) return;
    let alive = true;
    getSaveBackend()
      .load(saveParam)
      .then((record) => {
        if (!record) throw new SaveError('저장한 판을 찾지 못했다.');
        if (alive) setLoaded({ id: saveParam, game: readSaveRecord(record) });
      })
      .catch((err) => {
        const error = err instanceof SaveError ? err.message : '저장한 판을 불러오지 못했다.';
        if (alive) setLoaded({ id: saveParam, error });
      });
    return () => {
      alive = false;
    };
  }, [saveParam]);

  const state = useGameStore((s) => s.state);
  const viewer = useGameStore((s) => s.viewer);
  const controlled = useGameStore((s) => s.controlled);
  const status = useGameStore((s) => s.status);
  const start = useGameStore((s) => s.start);
  const reset = useGameStore((s) => s.reset);

  const setup = useMemo(() => {
    if (resumed) {
      const { state: saved } = resumed;
      return {
        seed: resumed.seed,
        players: saved.config.playerCount,
        highnoon: saved.config.expansions.includes('highnoon'),
        valley: saved.config.expansions.includes('valley'),
        goldrush: saved.config.expansions.includes('goldrush'),
        seats: resumed.seats as SeatSetup[],
        controlled: resumed.controlled,
        auto: resumed.controlled.length === 0,
        resume: saved,
      };
    }
    const players = clamp(Number(params.players ?? 5), 4, 7);
    const tier = (params.tier ?? 'medium') as AiTier;
    const seed = Number(params.seed ?? 1) || 1;
    const highnoon = params.highnoon === '1';
    const valley = params.valley === '1';
    const goldrush = params.goldrush === '1';
    const seats: SeatSetup[] = Array.from({ length: players }, (_, i) => ({
      id: `p${i}`,
      name: i === 0 ? '나' : AI_NAMES[(i - 1) % AI_NAMES.length],
      human: i === 0,
      tier,
    }));
    const auto = params.auto === '1';
    // 관전 모드에서는 아무 자리도 조작하지 않는다. 구동기가 전부 대신 둔다.
    return { seed, players, highnoon, valley, goldrush, seats, controlled: auto ? [] : ['p0'], auto, resume: undefined };
  }, [resumed, params.players, params.tier, params.seed, params.highnoon, params.valley, params.goldrush, params.auto]);

  const conn = useRoomConnection(code);
  useOnlineGameSession(code, conn);
  useChat(code, conn);

  // 주소로 곧장 들어온 경우에도 그림부터 받는다. 혼자 하는 판은 다 받은 뒤에 시작해
  // 드래프트 시계가 빈 카드를 띄운 채 흐르지 않게 한다
  const artReady = useArtReady();
  const artProgress = useArtProgress();
  useEffect(() => {
    void preloadArt();
  }, []);

  useEffect(() => {
    if (online || !artReady) return;
    // 저장본을 이어 볼 때는 다 불러온 뒤에 연다
    if (saveParam && !resumed) return;
    start({
      seed: setup.seed,
      config: setup.resume?.config ?? {
        playerCount: setup.players,
        expansions: [
          ...(setup.highnoon ? (['highnoon'] as const) : []),
          ...(setup.valley ? (['valley'] as const) : []),
          ...(setup.goldrush ? (['goldrush'] as const) : []),
        ],
      },
      seats: setup.seats,
      controlled: setup.controlled,
      resume: setup.resume,
    });
    return () => reset();
  }, [online, artReady, saveParam, resumed, setup, start, reset]);

  // AI 빠르기. 온라인은 방 문서의 값을 모두가 따르고 방장만 바꾼다. 혼자 하는 판은 내가 방장이다.
  const [localSpeed, setLocalSpeed] = useState<AiSpeed>(1);
  const speed: AiSpeed = online ? (conn.room?.aiSpeed ?? 1) : localSpeed;
  const onSpeedChange = useMemo(() => {
    if (!online) return setLocalSpeed;
    if (!conn.isHost || !code) return null;
    return (next: AiSpeed) => {
      setAiSpeed(code, next).catch(() => {});
    };
  }, [online, conn.isHost, code]);

  // 혼자 하는 판(상대가 전부 AI)은 멈출 수 있다. 온라인은 남을 붙잡으므로 안 된다.
  const [paused, setPaused] = useState(false);
  // 결과 카드를 잠깐 치우고 판과 채팅을 본다
  const [resultHidden, setResultHidden] = useState(false);
  const canPause = !online && Boolean(state) && !state?.result && !state?.draft;
  const halted = canPause && paused;
  // 흐른 시간. 판이 떠 있는 동안만 가고, 멈추거나 끝나면 선다
  const stopwatch = useStopwatch(
    Boolean(state) && !state?.result && !halted,
    resumed?.meta.elapsedMs ?? 0,
  );

  // 판 저장. AI 끼리 남은 혼자 하는 판에서만 연다. 온라인 판은 방이 계속 흘러가므로
  // 여기서 떼어 저장하면 두 갈래가 된다.
  const canSave = !online && canSaveGame(state, controlled);
  // 한 판은 한 칸에 덮어쓴다. 이어 보던 판이면 그 칸이다
  const saveId = useRef<string | null>(saveParam);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>({ k: 'idle' });
  const onSave = useCallback(() => {
    const snap = useGameStore.getState();
    if (!snap.state || !canSaveGame(snap.state, snap.controlled)) return;
    let record: SaveRecord;
    try {
      saveId.current ??= newSaveId(Date.now(), Math.random);
      record = makeSaveRecord({
        id: saveId.current,
        savedAt: Date.now(),
        seed: snap.seed,
        seats: snap.seats,
        controlled: snap.controlled,
        state: snap.state,
        elapsedMs: stopwatch.elapsed(),
      });
    } catch (err) {
      setSaveStatus({ k: 'error', message: err instanceof SaveError ? err.message : '저장하지 못했다.' });
      return;
    }
    setSaveStatus({ k: 'saving' });
    getSaveBackend()
      .put(record)
      .then(() => setSaveStatus({ k: 'saved' }))
      .catch((err) =>
        setSaveStatus({ k: 'error', message: err instanceof SaveError ? err.message : '저장하지 못했다.' }),
      );
  }, [stopwatch]);
  useEffect(() => {
    if (saveStatus.k !== 'saved' && saveStatus.k !== 'error') return;
    const timer = setTimeout(() => setSaveStatus({ k: 'idle' }), 6000);
    return () => clearTimeout(timer);
  }, [saveStatus]);

  // 관전 모드는 예전처럼 빠르게 흘려 본다
  useAiDriver(!halted, setup.auto ? 6 : speed);
  useTimeoutDriver(controlled, !halted);

  const view = useMemo(() => makeView(state, viewer), [state, viewer]);
  const api = useTable(view, viewer);

  const onPickIndex = useCallback(
    (index: number) => {
      if (!view || !viewer) return;
      // 캐릭터 드래프트 중이면 숫자키로 후보를 고른다
      if (api.draft) {
        const id = api.draft.offers[index];
        if (id) api.pickCharacter(id);
        return;
      }
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
    onCancel: () => {
      api.select(null);
      api.arm(null);
    },
    onPickIndex,
  });

  if (resumeError) {
    return (
      <View style={styles.loading}>
        <Text style={styles.loadingText}>{resumeError}</Text>
        <Pressable
          style={styles.resultButton}
          accessibilityRole="button"
          accessibilityLabel="돌아가기"
          onPress={() => router.replace('/local')}>
          <Text style={styles.resultButtonText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (!artReady || !state || !view || !viewer) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={Colors.highlight} />
        <Text style={styles.loadingText}>
          {conn.error ??
            (!artReady
              ? `그림을 불러오는 중${artProgress.total ? ` ${artProgress.loaded}/${artProgress.total}` : ''}`
              : online
                ? '판을 받아오는 중'
                : saveParam
                  ? '저장한 판을 불러오는 중'
                  : '판을 짜는 중')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <Table
        view={view}
        viewer={viewer}
        api={api}
        clock={<GameClock stopwatch={stopwatch} />}
      />

      {!state.result && (
        <View style={styles.topLeft}>
          {!setup.auto && !state.result && <SpeedControl speed={speed} onChange={onSpeedChange} />}
          {canPause && <PauseButton paused={paused} onToggle={() => setPaused((v) => !v)} />}
          {canSave && <SaveButton status={saveStatus} onSave={onSave} />}
          <SoundButton />
          <FullscreenButton />
        </View>
      )}

      {!state.result && (
        <View style={styles.saveNotice}>
          <SaveNotice status={saveStatus} onLeave={() => router.replace('/local')} />
        </View>
      )}

      {halted && (
        <View style={styles.pausedBanner}>
          <Text style={styles.pausedText}>일시정지</Text>
        </View>
      )}

      {online && status !== 'ready' && (
        <View style={styles.connection}>
          <Text style={styles.connectionText}>
            {status === 'connecting' ? '연결하는 중' : '연결이 끊겼다. 다시 붙는 중'}
          </Text>
        </View>
      )}

      {state.result && resultHidden && (
        <Pressable
          style={styles.resultPill}
          accessibilityRole="button"
          accessibilityLabel="결과 다시 보기"
          onPress={() => setResultHidden(false)}>
          <Text style={styles.resultPillText}>결과 다시 보기</Text>
        </Pressable>
      )}

      {state.result && !resultHidden && (
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
                accessibilityLabel="판 보기"
                onPress={() => setResultHidden(true)}>
                <Text style={styles.resultButtonText}>판 보기</Text>
              </Pressable>
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
  topLeft: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  saveNotice: {
    position: 'absolute',
    top: Spacing.two + 34,
    left: Spacing.two,
    maxWidth: 360,
  },
  pausedBanner: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    pointerEvents: 'none',
    backgroundColor: Colors.overlay,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: Colors.highlight,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
  },
  pausedText: { color: Colors.paper, fontSize: 18, fontWeight: '900', letterSpacing: 2 },
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
  resultPill: {
    position: 'absolute',
    top: Spacing.two,
    alignSelf: 'center',
    backgroundColor: Colors.cardBrown,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.highlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
  },
  resultPillText: { color: Colors.paper, fontSize: 12, fontWeight: '800' },
});
