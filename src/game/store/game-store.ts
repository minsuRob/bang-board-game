/**
 * 게임 스토어.
 *
 * 엔진을 감싸기만 한다. 규칙은 하나도 여기 없다.
 * 상태는 액션 로그를 접어서 만들어지므로, 어떤 트랜스포트를 쓰든 같은 판이 나온다.
 */

import { create } from 'zustand';

import type { AiTier } from '../ai/types';
import {
  actorsOf,
  reduce,
  viewFor,
  type Action,
  type GameConfig,
  type GameState,
  type PlayerId,
} from '../engine';
import { createLocalTransport } from './local-transport';
import { emitTransition } from './transition-bus';
import type { Transport, TransportStatus } from './transport';

export type SeatSetup = {
  id: PlayerId;
  name: string;
  /** 사람이 앉은 자리인가 */
  human: boolean;
  /** AI 자리라면 난이도 */
  tier: AiTier;
};

export type StartOptions = {
  seed: number;
  config: GameConfig;
  seats: SeatSetup[];
  /** 이 클라이언트가 조작하는 좌석들. 핫시트면 여럿일 수 있다. */
  controlled: PlayerId[];
  transport?: Transport;
  /** 이 클라이언트가 AI 좌석과 시간 만료를 대신 굴리는가 */
  drives?: boolean;
  /**
   * 판을 여는 액션을 이 클라이언트가 제출하는가.
   *
   * 온라인에서는 호스트 하나만 제출한다. 나머지는 로그를 받아 접기만 한다.
   */
  submitStart?: boolean;
  /**
   * 저장본에서 이어 본다. 이 상태에서 곧장 시작하고 startGame 은 내지 않는다.
   * 이후 액션은 평소처럼 트랜스포트를 돌아 이 상태 위에 접힌다.
   */
  resume?: GameState;
};

type GameStore = {
  state: GameState | null;
  seats: SeatSetup[];
  controlled: PlayerId[];
  /** 지금 화면을 보고 있는 사람 (핫시트에서 바뀐다) */
  viewer: PlayerId | null;
  /** 핫시트에서 다음 사람에게 넘기기 전 가림막 */
  handoffPending: boolean;
  status: TransportStatus;
  seed: number;
  drives: boolean;
  /**
   * 이 판에 적용된 액션 전부 (startGame 포함). 판이 끝나면 보상 정산을 위해 올린다.
   * 저장본에서 이어 본 판은 앞부분이 없으므로 historyComplete 가 false 다.
   */
  history: Action[];
  historyComplete: boolean;

  start(options: StartOptions): void;
  submit(action: Action): void;
  setViewer(pid: PlayerId): void;
  setDrives(drives: boolean): void;
  confirmHandoff(): void;
  reset(): void;
};

let transport: Transport | null = null;
let unsubscribe: (() => void) | null = null;

export const useGameStore = create<GameStore>((set, get) => ({
  state: null,
  seats: [],
  controlled: [],
  viewer: null,
  handoffPending: false,
  status: 'closed',
  seed: 0,
  drives: true,
  history: [],
  historyComplete: false,

  start(options) {
    get().reset();

    transport = options.transport ?? createLocalTransport();
    const stopStatus = transport.onStatus?.((status) => set({ status }));
    const stopActions = transport.subscribe((action) => {
      const prev = get().state;
      let next: GameState;
      try {
        next = reduce(prev, action);
      } catch (err) {
        console.warn('Failed to apply action', action, err);
        return;
      }
      // 결과가 난 뒤의 액션은 상태를 바꾸지 않으므로 기록에도 넣지 않는다
      const history = prev?.result ? get().history : [...get().history, action];
      set({ state: next, history, viewer: get().viewer ?? options.controlled[0] ?? null });
      // 연출 층은 가리지 않은 prev/next 가 필요하다. 커밋 전에 동기로 알린다.
      emitTransition({ prev, next, action });
    });
    unsubscribe = () => {
      stopActions();
      stopStatus?.();
    };

    set({
      seats: options.seats,
      controlled: options.controlled,
      viewer: options.controlled[0] ?? options.seats[0]?.id ?? null,
      status: 'ready',
      seed: options.seed,
      drives: options.drives ?? true,
      handoffPending: false,
      history: [],
      historyComplete: !options.resume,
    });

    const startAction: Action = {
      type: 'startGame',
      seed: options.seed,
      config: options.config,
      seats: options.seats.map((s) => ({ id: s.id, name: s.name })),
    };

    if (options.resume) {
      set({ state: options.resume });
      // prev 가 없으면 연출 층은 판을 그대로 놓는다 (fx-plan 의 snap)
      emitTransition({ prev: null, next: options.resume, action: startAction });
      return;
    }

    if (options.submitStart ?? true) transport.submit(startAction);
  },

  submit(action) {
    transport?.submit(action);
  },

  setViewer(pid) {
    set({ viewer: pid, handoffPending: false });
  },

  setDrives(drives) {
    set({ drives });
  },

  confirmHandoff() {
    set({ handoffPending: false });
  },

  reset() {
    unsubscribe?.();
    transport?.close();
    unsubscribe = null;
    transport = null;
    set({
      state: null,
      seats: [],
      controlled: [],
      viewer: null,
      handoffPending: false,
      status: 'closed',
      history: [],
      historyComplete: false,
    });
  },
}));

// ---------------------------------------------------------------------------
// 선택자
// ---------------------------------------------------------------------------

/**
 * 지금 화면 주인의 눈으로 본 상태.
 *
 * zustand 선택자로 직접 넘기면 안 된다. viewFor() 가 매번 새 객체를 만들기 때문에
 * 스냅숏 비교가 끝없이 실패해 렌더 루프에 빠진다. 화면에서 useMemo 로 감싸 쓴다.
 */
export function makeView(state: GameState | null, viewer: PlayerId | null): GameState | null {
  if (!state || !viewer) return null;
  return viewFor(state, viewer);
}

/** 지금 행동해야 하는 사람 (드래프트 중이면 아직 안 고른 첫 사람) */
export function selectActor(state: GameState | null): PlayerId | null {
  if (!state) return null;
  return actorsOf(state)[0] ?? null;
}

/** 지금 행동해야 하는 사람 전원. 캐릭터 드래프트 중에만 여럿이다. */
export function selectActors(state: GameState | null): PlayerId[] {
  return state ? actorsOf(state) : [];
}

export function seatOf(seats: SeatSetup[], pid: PlayerId | null): SeatSetup | null {
  return seats.find((s) => s.id === pid) ?? null;
}
