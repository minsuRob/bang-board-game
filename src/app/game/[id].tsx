import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, Text, useWindowDimensions, View } from 'react-native';

import { LOCAL_AI_SPEEDS, type AiSpeed, type AiTier, type LocalAiSpeed } from '@/game/ai/types';
import { setAiSpeed } from '@/firebase/rooms';
import { EVENTS, eventExpansionOf, expansionsFor, isEventExpansion } from '@/game/data/events';
import type { EventCardId } from '@/game/data/types';
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
import { formatElapsed, GameClock, useStopwatch } from '@/game/ui/GameClock';
import { LogCardPeek } from '@/game/ui/LogPanel';
import { FullscreenButton } from '@/game/ui/FullscreenButton';
import { PauseButton } from '@/game/ui/PauseButton';
import { SaveButton, SaveNotice, type SaveStatus } from '@/game/ui/SaveButton';
import { SettingsButton } from '@/game/ui/SettingsButton';
import { SettingsSheet } from '@/game/ui/settings/SettingsSheet';
import { SoundButton } from '@/game/ui/SoundButton';
import { SpeedControl } from '@/game/ui/SpeedControl';
import { ResultTable } from '@/game/ui/ResultTable';
import { RewardLine } from '@/game/ui/RewardLine';
import { useSettlement } from '@/game/store/use-settlement';
import { Table } from '@/game/ui/Table';
import { useHotkeys } from '@/game/ui/use-hotkeys';
import { handleCardPress } from '@/game/ui/table-text';
import { useTable } from '@/game/ui/use-table';
import { WesternFonts } from '@/game/ui/menu/western-fonts';
import { themedStyles, useColors } from '@/game/ui/theme/use-theme';
import { Colors, MobileBreakpoint, Radius, Spacing } from '@/constants/theme';

const AI_NAMES = ['보안관보', '건슬링어', '떠돌이', '광부', '바텐더', '현상금꾼', '무법자'];

/** 개발용 주소 옵션(devEvent · notimer)은 웹 개발 모드에서만 받는다. fxloop 과 같은 관례다 */
const DEV_WEB = __DEV__ && Platform.OS === 'web';

function devEventOf(value: string | undefined): EventCardId | null {
  if (!DEV_WEB || !value) return null;
  return value in EVENTS ? (value as EventCardId) : null;
}

export default function GameScreen() {
  const params = useLocalSearchParams<{
    id: string;
    players?: string;
    tier?: string;
    /** 상황 카드 확장판 하나 (highnoon · wildwestshow · fistful). 없거나 none 이면 끈다 */
    event?: string;
    /** 예전 주소. event 가 없을 때만 본다 */
    highnoon?: string;
    wildwestshow?: string;
    /** 1이면 그림자의 계곡 카드·캐릭터를 섞는다 */
    valley?: string;
    goldrush?: string;
    seed?: string;
    /** 1이면 내 자리까지 AI가 두는 관전 모드 */
    auto?: string;
    /** 저장한 판 id. 있으면 그 판을 이어 본다 (다른 설정 값은 무시) */
    save?: string;
    /** 개발용: 이 이벤트가 보안관의 첫 차례부터 걸려 있다 (그 확장판을 저절로 켠다) */
    devEvent?: string;
    /** 개발용: 1이면 내 자리 제한시간을 끈다 */
    notimer?: string;
  }>();
  const router = useRouter();
  const styles = useStyles();
  const c = useColors();
  // 설정 팝업. 열어도 판은 멈추지 않는다 (온라인 판과 같게)
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 폰 폭에서는 위쪽 버튼 줄이 좌석을 가린다. ⚙ 하나만 두고 나머지는 설정 팝업 안으로 접는다
  const { width } = useWindowDimensions();
  const compact = width < MobileBreakpoint;

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
        event: eventExpansionOf(saved.config.expansions),
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
    const legacyEvent =
      params.highnoon === '1' ? 'highnoon' : params.wildwestshow === '1' ? 'wildwestshow' : null;
    const devEvent = devEventOf(params.devEvent);
    const chosen = isEventExpansion(params.event) ? params.event : params.event ? null : legacyEvent;
    const devExpansion = devEvent ? EVENTS[devEvent].expansion : null;
    const event = devExpansion && isEventExpansion(devExpansion) ? devExpansion : chosen;
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
    return {
      seed,
      players,
      event,
      valley,
      goldrush,
      seats,
      controlled: auto ? [] : ['p0'],
      auto,
      resume: undefined,
      devEvent,
    };
  }, [resumed, params.players, params.tier, params.seed, params.event, params.highnoon, params.wildwestshow, params.valley, params.goldrush, params.auto, params.devEvent]);

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
        expansions: expansionsFor(setup),
        ...('devEvent' in setup && setup.devEvent ? { devEvent: setup.devEvent } : {}),
      },
      seats: setup.seats,
      controlled: setup.controlled,
      resume: setup.resume,
    });
    return () => reset();
  }, [online, artReady, saveParam, resumed, setup, start, reset]);

  // AI 빠르기. 온라인은 방 문서의 값을 모두가 따르고 방장만 바꾼다. 혼자 하는 판은 내가 방장이다.
  // 혼자 하는 판은 검증용으로 4배를 넘는 배속(최대 100배)까지 고를 수 있다. 온라인 방은 1~4배다.
  const [localSpeed, setLocalSpeed] = useState<LocalAiSpeed>(1);
  const speed: LocalAiSpeed = online ? (conn.room?.aiSpeed ?? 1) : localSpeed;
  const onSpeedChange = useMemo(() => {
    if (!online) return (next: LocalAiSpeed) => setLocalSpeed(next);
    if (!conn.isHost || !code) return null;
    return (next: LocalAiSpeed) => {
      setAiSpeed(code, next as AiSpeed).catch(() => {});
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

  // 관전 모드는 예전처럼 6배 이상으로 흘려 보고, 배속 칩으로 더 올릴 수 있다
  // 온라인에서는 남의 사람 자리를 AI 가 두지 않는다 (제한시간만 넘긴다)
  useAiDriver(!halted, setup.auto ? Math.max(6, speed) : speed, online);
  // 개발용 ?notimer=1: 확인하는 동안 내 차례가 시간에 넘어가지 않게 한다
  const noTimer = DEV_WEB && params.notimer === '1';
  useTimeoutDriver(controlled, !halted && !noTimer);

  const view = useMemo(() => makeView(state, viewer), [state, viewer]);
  const api = useTable(view, viewer);

  // 판이 끝나면 보상 정산 (docs/economy.md)
  const settlement = useSettlement({
    online,
    code,
    room: conn.room,
    state,
    uid: conn.identity?.uid ?? null,
  });

  const onPickIndex = useCallback(
    (index: number) => {
      if (!view || !viewer) return;
      // 캐릭터 드래프트 중이면 숫자키로 후보를 고른다
      if (api.draft) {
        const id = api.draft.offers[index];
        if (id) api.pickCharacter(id);
        return;
      }
      // 낼 방법 고르기 중이면 그 번호를 고른다
      if (api.prompt?.variants?.length) {
        if (index < api.prompt.variants.length) api.respond({ c: 'variant', index });
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
      handleCardPress(api, card);
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
          style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
          accessibilityRole="button"
          accessibilityLabel="돌아가기"
          onPress={() => router.replace('/local')}>
          <Text style={styles.secondaryText}>돌아가기</Text>
        </Pressable>
      </View>
    );
  }

  if (!artReady || !state || !view || !viewer) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={c.highlight} />
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

  const speedControl = (
    <SpeedControl
      speed={speed}
      onChange={onSpeedChange}
      speeds={online ? undefined : LOCAL_AI_SPEEDS}
      hideLabel={compact}
    />
  );
  const gameButtons = (
    <>
      {canPause && <PauseButton paused={paused} onToggle={() => setPaused((v) => !v)} />}
      {canSave && <SaveButton status={saveStatus} onSave={onSave} />}
      <SoundButton />
    </>
  );

  return (
    <View style={styles.root}>
      <Table
        view={view}
        viewer={viewer}
        api={api}
        clock={<GameClock stopwatch={stopwatch} />}
      />

      <LogCardPeek />

      {!state.result && (
        <View style={[styles.topLeft, compact && styles.topLeftCompact]}>
          {compact ? (
            <SettingsButton onPress={() => setSettingsOpen(true)} />
          ) : (
            <>
              {speedControl}
              {gameButtons}
              <SettingsButton onPress={() => setSettingsOpen(true)} />
              <FullscreenButton />
            </>
          )}
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
        <View style={[styles.overlay, compact && styles.overlayCompact]}>
          <View style={[styles.resultCard, compact && styles.resultCardCompact]}>
            <Text style={styles.resultTitle}>
              {state.result.winners.map((r) => ROLE_LABEL[r]).join('·')} 승리
            </Text>
            <Text style={styles.resultReason}>{state.result.reason}</Text>
            {/* 판이 끝나면 스톱워치가 서므로 이 값이 최종 시간이다 */}
            <Text style={styles.resultElapsed}>걸린 시간 {formatElapsed(stopwatch.elapsed())}</Text>
            <RewardLine view={settlement} />
            <ResultTable state={state} viewer={viewer} compact={compact} />
            <View style={styles.resultButtons}>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
                accessibilityRole="button"
                accessibilityLabel="판 보기"
                onPress={() => setResultHidden(true)}>
                <Text style={styles.secondaryText}>판 보기</Text>
              </Pressable>
              {/* 주 행동은 빨간 도장 */}
              <Pressable
                style={({ pressed }) => [styles.stamp, pressed && styles.stampPressed]}
                accessibilityRole="button"
                accessibilityLabel="다시 하기"
                onPress={() => router.replace('/local')}>
                <View style={styles.stampInner}>
                  <Text style={styles.stampText}>다시 하기</Text>
                </View>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.secondary, pressed && styles.secondaryPressed]}
                accessibilityRole="button"
                accessibilityLabel="처음으로"
                onPress={() => router.replace('/')}>
                <Text style={styles.secondaryText}>처음으로</Text>
              </Pressable>
            </View>
          </View>
        </View>
      )}

      {settingsOpen && (
        <SettingsSheet onClose={() => setSettingsOpen(false)}>
          {compact && !state.result && (
            <View style={styles.sheetControls}>
              <Text style={styles.sheetLabel}>AI 속도</Text>
              {speedControl}
              <View style={styles.sheetButtons}>
                {gameButtons}
                <FullscreenButton />
              </View>
            </View>
          )}
        </SettingsSheet>
      )}
    </View>
  );
}

function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : lo;
}

const useStyles = themedStyles((c) => ({
  // 판 바탕은 테마와 상관없이 늘 어두운 살롱이다
  root: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    backgroundColor: c.background,
  },
  loadingText: { color: c.textMuted, fontSize: 13.5, fontFamily: WesternFonts.body },
  topLeft: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  // 폰 판의 위쪽 제목 줄(약 44px) 바로 아래에 ⚙ 만 띄운다
  topLeftCompact: { top: 52 },
  sheetControls: { gap: Spacing.two, alignItems: 'flex-start' },
  sheetLabel: { color: c.textMuted, fontSize: 12, fontWeight: '700', fontFamily: WesternFonts.label, marginBottom: -4 },
  sheetButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  saveNotice: {
    position: 'absolute',
    top: Spacing.two + 38,
    left: Spacing.two,
    maxWidth: 360,
  },
  pausedBanner: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    pointerEvents: 'none',
    backgroundColor: c.panel,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.highlight,
    paddingHorizontal: Spacing.five,
    paddingVertical: Spacing.two,
    boxShadow: `0 4px 14px ${c.shadow}`,
  },
  pausedText: { color: c.heading, fontSize: 20, fontWeight: '900', letterSpacing: 3, fontFamily: WesternFonts.title },
  connection: {
    position: 'absolute',
    top: Spacing.two,
    alignSelf: 'center',
    backgroundColor: c.panel,
    borderRadius: Radius.pill,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  connectionText: { color: c.textMuted, fontSize: 11.5, fontWeight: '700', fontFamily: WesternFonts.body },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.scrim,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
  },
  resultCard: {
    backgroundColor: c.surface,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.panelBorder,
    padding: Spacing.four,
    gap: Spacing.two,
    width: '100%',
    maxWidth: 720,
    boxShadow: `0 10px 30px ${c.shadow}`,
  },
  // 폰 폭: 결과 표의 이름 칸이 넓도록 바깥 여백을 줄인다
  overlayCompact: { padding: Spacing.two },
  resultCardCompact: { padding: Spacing.three },
  resultTitle: {
    color: c.heading,
    fontSize: 28,
    fontWeight: '900',
    textAlign: 'center',
    fontFamily: WesternFonts.label,
    // 제목 밑 두 줄 괘선 (종이 메뉴의 PaperHeading 과 같은 모양)
    paddingBottom: Spacing.two,
    borderBottomWidth: 3,
    borderBottomColor: c.rule,
  },
  resultReason: { color: c.text, fontSize: 14.5, textAlign: 'center', fontFamily: WesternFonts.body },
  resultElapsed: {
    color: c.textMuted,
    fontSize: 13,
    textAlign: 'center',
    fontFamily: WesternFonts.body,
    fontVariant: ['tabular-nums'],
  },
  resultButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.two,
  },
  // 빨간 도장 (PaperUi 의 StampButton 을 작게)
  stamp: {
    backgroundColor: c.accent,
    borderRadius: 6,
    padding: 3,
    boxShadow: `0 4px 0 ${c.accentShadow}, 0 8px 14px ${c.shadow}`,
  },
  stampPressed: { transform: [{ translateY: 2 }], boxShadow: `0 2px 0 ${c.accentShadow}, 0 4px 8px ${c.shadow}` },
  stampInner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,246,234,0.6)',
    borderRadius: 4,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  stampText: { color: c.onAccent, fontSize: 15, fontWeight: '900', letterSpacing: 2, fontFamily: WesternFonts.label },
  // 보조 버튼: 고르지 않은 칩 모양
  secondary: {
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
    backgroundColor: c.chip,
  },
  secondaryPressed: { backgroundColor: c.hover },
  secondaryText: { color: c.text, fontWeight: '800', fontSize: 13, fontFamily: WesternFonts.label },
  resultPill: {
    position: 'absolute',
    top: Spacing.two,
    alignSelf: 'center',
    backgroundColor: c.panel,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: c.highlight,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.one + 1,
    boxShadow: `0 2px 6px ${c.shadow}`,
  },
  resultPillText: { color: c.text, fontSize: 12.5, fontWeight: '800', fontFamily: WesternFonts.label },
}));
