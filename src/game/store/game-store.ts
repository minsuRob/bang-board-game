/**
 * 게임 스토어.
 *
 * 엔진을 감싸기만 한다. 규칙은 하나도 여기 없다.
 * 상태는 액션 로그를 접어서 만들어지므로, 어떤 트랜스포트를 쓰든 같은 판이 나온다.
 */

import { create } from 'zustand';

import type { AiTier } from '../ai/types';
import {
  reduce,
  viewFor,
  type Action,
  type GameConfig,
  type GameState,
  type PlayerId,
} from '../engine';
import { createLocalTransport } from './local-transport';
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

  start(options) {
    get().reset();

    transport = options.transport ?? createLocalTransport();
    const stopStatus = transport.onStatus?.((status) => set({ status }));
    const stopActions = transport.subscribe((action) => {
      set((prev) => {
        try {
          const next = reduce(prev.state, action);
          return { state: next, viewer: prev.viewer ?? options.controlled[0] ?? null };
        } catch (err) {
          console.warn('액션을 적용하지 못했다', action, err);
          return prev;
        }
      });
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
    });

    if (options.submitStart ?? true) {
      transport.submit({
        type: 'startGame',
        seed: options.seed,
        config: options.config,
        seats: options.seats.map((s) => ({ id: s.id, name: s.name })),
      });
    }
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

/** 지금 행동해야 하는 사람 */
export function selectActor(state: GameState | null): PlayerId | null {
  if (!state || state.result) return null;
  return state.awaiting ? state.awaiting.pid : state.turn.active;
}

export function seatOf(seats: SeatSetup[], pid: PlayerId | null): SeatSetup | null {
  return seats.find((s) => s.id === pid) ?? null;
}
