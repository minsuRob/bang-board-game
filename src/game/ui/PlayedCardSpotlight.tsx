/**
 * 테이블 한가운데에 카드 한 장을 크게 띄운다.
 *
 * 1. 누가 카드를 내면 잠깐 떴다 사라진다. 로그를 읽으므로 3D·2D·모바일 어디서나 같고,
 *    온라인에서도 남이 낸 카드가 똑같이 뜬다.
 *    하이 눈 이벤트 카드가 새로 공개될 때도 같은 자리에 뜬다. 판 전체에 걸리는 효과라 더 오래 떠 있다.
 * 2. 내 손패를 살펴보는 동안(웹 hover, 폰 첫 탭) 그 카드가 떠 있다. 이쪽이 우선이다.
 *
 * 카드 아래에는 드래프트와 같은 종이 명판으로 상황과 카드 효과를 적는다.
 * 왼쪽에 낸 사람의 캐릭터 카드를 세운다. 누구를 겨눈 카드면 오른쪽에 대상의 캐릭터 카드도 세운다.
 * 드러난 부관이면 캐릭터 카드 위에 부관 별을 단다.
 * 연출이 붙은 카드(fx/card-fx.ts)는 카드가 올라선 직후 소리와 화면 효과가 같은 틱에 터진다.
 * 첫 메뉴에서 고화질을 골랐고 Skia 가 준비됐으면 Skia 연출(fx/skia), 아니면 일반 연출(RN Animated).
 *
 * 캣 발루·강탈·리코체는 낸 카드가 사라진 뒤 결과를 한 번 더 띄운다. 공개된 카드면 그 카드,
 * 손패에서 뽑았으면 뒷면이다. 결과가 낸 카드를 덮지 않게 차례를 기다린다.
 *
 * 판정(술통·다이너마이트·감옥 …)·블랙 잭·피요테로 펼친 카드도 결과처럼 줄 서서 뜬다.
 * 카드가 올라선 뒤 나온 무늬를 큰 배지로 강조하고, 성공·실패 도장을 찍는다.
 */

import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { cancelAnimation, Easing as ReEasing, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';
import { useStore } from 'zustand';

import { BASE_DECK } from '../data/cards.base';
import { HIGHNOON_EVENT_IDS } from '../data/cards.highnoon';
import { RED_SUITS, SUIT_GLYPH, type CardId, type CharacterId, type EventCardDef, type Suit } from '../data/types';
import {
  cardOf,
  defOf,
  kindOf,
  roleVisibleTo,
  type GameEvent,
  type GameState,
  type JudgementPurpose,
  type PlayerId,
} from '../engine';
import { fxPacing } from '../store/fx-pacing';
import { roleArt } from './card-art';
import { CAN_HOVER, cardPeek, setPeek } from './card-peek';
import { CharacterCard } from './CharacterCard';
import { CARD_DIMENSIONS, CardBack, CardView } from './CardView';
import { EventCardFace } from './EventCardFace';
import { cardFxFor, type CardFx } from './fx/card-fx';
import { GUNSHOT_MS, GunshotFx, recoilStyle, screenFlashStyle } from './fx/GunshotFx';
import { fxQuality } from './fx/quality';
import { loadSkiaFx, skiaFx } from './fx/skia/load';
import { ShotCardWrap } from './fx/skia/ShotCardWrap';
import {
  EMPTY_GEOM,
  FX_GUNSHOT,
  FX_MISSED,
  GUNSHOT_HQ_MS,
  MISSED_HQ_MS,
  MISSED_RELEASE_MS,
  RELEASE_MS,
  type ShotGeom,
} from './fx/skia/timeline';
import { PaperPlaque, plaque } from './PaperPlaque';
import { PickSpotlight } from './PickSpotlight';
import { playSfx, preloadSfx } from './sfx';
import { isFollowUp, isRevealEvent, isTakeEvent, pickSpotlights, revealedEventOf, takenCardOf } from './spotlight-pick';
import type { TableApi } from './use-table';
import { Colors, Spacing } from '@/constants/theme';

const NATIVE_DRIVER = Platform.OS !== 'web';

/** 카드 양옆에 세우는 캐릭터 카드 폭 */
const FACE_W = 112;
const FACE_W_COMPACT = 76;

/** 1배속에서 떠 있는 시간 */
const SHOW_MS = 2200;

/** 이벤트 카드는 효과 글이 길고 판 전체에 걸린다. 1배속에서 떠 있는 시간과, 빨리 둘 때도 지키는 최소 */
const EVENT_SHOW_MS = 4200;
const EVENT_MIN_MS = 1800;

/** 펼친 카드는 무늬 배지와 도장까지 읽을 시간을 더 준다 (1배속) */
const REVEAL_SHOW_MS = 2600;
/** 카드가 올라선 뒤 무늬 배지가 튀어 오르기까지, 배지가 뜬 뒤 도장이 찍히기까지 (1배속) */
const BADGE_DELAY_MS = 260;
const STAMP_DELAY_MS = 320;

/** 카드가 튀어 오른 뒤 총이 터지기까지 (1배속) */
const FIRE_DELAY_MS = 180;

export type PlayedCardSpotlightProps = {
  view: GameState;
  viewer: PlayerId;
  api: Pick<TableApi, 'playable' | 'discardable' | 'prompt' | 'respond'>;
  compact?: boolean;
};

/** 고화질 총격이 쓰는 무대: 진행도, 총구 자리, 자리를 잴 기준 레이어 */
type HqStage = { progress: SharedValue<number>; geom: SharedValue<ShotGeom>; layer: React.RefObject<View | null> };

/**
 * 연출 무대. 소리와 고화질 연출을 미리 불러 두고, 고화질 캔버스 하나와 그 진행도·자리를 쥔다.
 * 캔버스는 화면마다 하나만 띄워 두고 연출마다 다시 쓴다 (CardFxSkia 머리말 참고)
 */
function useFxStage() {
  // 첫 총성이 늦게 나지 않게 화면에 들어올 때 불러 둔다
  useEffect(preloadSfx, []);
  const quality = useStore(fxQuality, (s) => s.quality);
  useEffect(() => {
    if (quality === 'high') void loadSkiaFx();
  }, [quality]);

  const skia = useStore(skiaFx, (s) => s.gunshot);
  const hqLayer = quality === 'high' ? skia : null;
  const progress = useSharedValue(0);
  const geom = useSharedValue<ShotGeom>(EMPTY_GEOM);
  const layer = useRef<View>(null);
  const stage: HqStage | null = hqLayer ? { progress, geom, layer } : null;
  return { hqLayer, progress, geom, layer, stage };
}

export function PlayedCardSpotlight({ view, viewer, api, compact }: PlayedCardSpotlightProps) {
  const [shown, setShown] = useState<GameEvent | null>(null);
  // 지금 떠 있는 것과, 그 뒤에 줄 선 결과들 (캣 발루·강탈의 결과, 판정으로 펼친 카드)
  const shownRef = useRef<GameEvent | null>(null);
  const pending = useRef<GameEvent[]>([]);
  const show = (e: GameEvent | null) => {
    shownRef.current = e;
    setShown(e);
  };
  // 처음 그릴 때 이미 있던 로그는 띄우지 않는다
  const seen = useRef<number | null>(null);
  const peek = useStore(cardPeek, (s) => s.card);
  const hand = view.players.find((p) => p.id === viewer)?.hand ?? [];
  const peeking = peek !== null && hand.includes(peek) ? peek : null;
  // 잡화점·강탈·캣 발루로 고르는 중이면 가운데 창이 가장 앞이다
  const picking = api.prompt?.center ? api.prompt : null;

  const { hqLayer, progress, geom, layer, stage } = useFxStage();

  // 개발용 (웹): 주소에 ?fxloop=1 이면 뱅!, ?fxloop=missed 면 빗나감! 연출을 3초마다 되풀이한다.
  // ?fxloop=event 면 하이 눈 이벤트 카드를 한 장씩 돌려 가며 띄운다.
  // ?fxloop=take 면 캣 발루·강탈 결과(손패 뒷면, 장비 앞면)를 번갈아 띄운다.
  // ?fxloop=reveal 이면 판정·블랙 잭으로 펼친 카드(성공·실패·축복)를 돌려 가며 띄운다.
  // ?fxloop=hold 면 되풀이하지 않고 globalThis.__shot 으로 진행도를 손으로 멈춰 한 장면씩 본다
  // (__shot.progress.value = 0.2 로 멈추기, __shot.start() 로 한 번 돌리기)
  useEffect(() => {
    const mode = __DEV__ && Platform.OS === 'web' ? /[?&]fxloop=(\w+)/.exec(globalThis.location?.search ?? '')?.[1] : null;
    if (!mode) return;
    (globalThis as { __shot?: unknown }).__shot = {
      progress,
      geom,
      start: (ms = 2000) => {
        progress.value = 0;
        progress.value = withTiming(1, { duration: ms, easing: ReEasing.linear });
      },
    };
    if (mode === 'event') {
      let i = 0;
      let seq = 1_000_000;
      const make = (): GameEvent => {
        const id = HIGHNOON_EVENT_IDS[i++ % HIGHNOON_EVENT_IDS.length];
        return { t: 'event', card: id, text: '연출 시험 — 이벤트', seq: seq++ };
      };
      show(make());
      const timer = setInterval(() => show(make()), EVENT_SHOW_MS + 800);
      return () => clearInterval(timer);
    }
    if (mode === 'reveal') {
      const pick = (kind: string, suit: Suit) => BASE_DECK.find((c) => c.kind === kind && c.suit === suit)?.id ?? BASE_DECK[0].id;
      const a = view.players[0]?.id;
      const samples: Omit<GameEvent, 'seq'>[] = [
        { t: 'judgement', pid: a, card: pick('beer', 'hearts'), reveal: { suit: 'hearts', hit: true, purpose: 'barrel' }, text: '연출 시험 — 술통 판정 성공' },
        { t: 'judgement', pid: a, card: pick('bang', 'spades'), reveal: { suit: 'spades', hit: true, purpose: 'dynamite' }, text: '연출 시험 — 다이너마이트 폭발' },
        { t: 'judgement', pid: a, card: pick('bang', 'clubs'), reveal: { suit: 'clubs', hit: false, purpose: 'jail' }, text: '연출 시험 — 감옥 판정 실패' },
        { t: 'blackJack', pid: a, card: pick('bang', 'diamonds'), reveal: { suit: 'diamonds', hit: true }, text: '연출 시험 — 블랙 잭' },
        { t: 'judgement', pid: a, card: pick('missed', 'clubs'), reveal: { suit: 'hearts', hit: true, purpose: 'barrel' }, text: '연출 시험 — 축복으로 ♥' },
      ];
      let i = 0;
      let seq = 1_000_000;
      const make = (): GameEvent => ({ ...samples[i++ % samples.length], seq: seq++ });
      show(make());
      const timer = setInterval(() => show(make()), REVEAL_SHOW_MS + 800);
      return () => clearInterval(timer);
    }
    if (mode === 'take') {
      const barrel = BASE_DECK.find((c) => c.kind === 'barrel')?.id;
      const [a, b] = [view.players[0]?.id, view.players[1]?.id];
      const samples: Omit<GameEvent, 'seq'>[] = [
        { t: 'catBalou', pid: a, target: b, text: '연출 시험 — 손패를 버리게 했다.' },
        { t: 'catBalou', pid: a, target: b, card: barrel, text: '연출 시험 — 장비를 버리게 했다.' },
        { t: 'panic', pid: b, target: a, text: '연출 시험 — 손패를 강탈했다.' },
      ];
      let i = 0;
      let seq = 1_000_000;
      const make = (): GameEvent => ({ ...samples[i++ % samples.length], seq: seq++ });
      show(make());
      const timer = setInterval(() => show(make()), SHOW_MS + 800);
      return () => clearInterval(timer);
    }
    if (mode !== '1' && mode !== 'missed') return;
    const isMissed = mode === 'missed';
    const card = BASE_DECK.find((c) => c.kind === (isMissed ? 'missed' : 'bang'));
    if (!card) return;
    let seq = 1_000_000;
    const make = (): GameEvent =>
      isMissed
        ? { t: 'playMissed', card: card.id, text: '연출 시험 — 빗나감!', seq: seq++ }
        : { t: 'playCard', card: card.id, text: '연출 시험 — 뱅!', seq: seq++ };
    const timer = setInterval(() => show(make()), 3400);
    return () => clearInterval(timer);
    // 개발용이라 처음 한 번만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, geom]);

  useEffect(() => {
    const lastSeq = view.log[view.log.length - 1]?.seq ?? 0;
    const since = seen.current;
    seen.current = lastSeq;
    if (since === null || lastSeq <= since) return;
    const picked = pickSpotlights(view.log, since);
    if (picked.length === 0) return;
    const [first, ...rest] = picked;
    if (isFollowUp(first) && shownRef.current) {
      pending.current = [...pending.current, ...picked].slice(-3);
      return;
    }
    // 다른 카드가 끼어들면 기다리던 결과는 버린다. 빨리 둘 때 연출이 밀리지 않게
    pending.current = rest;
    show(first);
  }, [view.log]);

  const shownEvent = shown ? revealedEventOf(shown) : null;
  const clear = (cur: GameEvent) => {
    if (shownRef.current !== cur) return;
    const [next = null, ...rest] = pending.current;
    pending.current = rest;
    show(next);
  };


  // 살펴보던 카드가 손을 떠났다 (냈거나 뺏겼다)
  useEffect(() => {
    if (peek !== null && peeking === null) setPeek(null);
  }, [peek, peeking]);

  // 살펴보기가 앞을 가리는 동안에도 낸 카드는 보이지 않게 제 시간을 다 돌고 사라진다.
  // 내렸다가 다시 올리면 닫은 뒤 옛 카드가 다시 튀어 오르기 때문이다. 총성은 그대로 들린다
  return (
    <View ref={layer} style={styles.root}>
      {shown && (
        <View style={[styles.layer, styles.passThrough, (peeking || picking) && styles.hidden]}>
          {shownEvent ? (
            <EventSpot key={`${shown.seq}:${shown.card}`} def={shownEvent} compact={compact} onDone={() => clear(shown)} />
          ) : isRevealEvent(shown) ? (
            <RevealSpot
              key={`${shown.seq}:${shown.t}:${shown.card}`}
              event={shown}
              faces={facesOf(view, viewer, shown)}
              compact={compact}
              onDone={() => clear(shown)}
            />
          ) : isTakeEvent(shown) ? (
            <TakenSpot
              key={`${shown.seq}:${shown.t}:${shown.card ?? 'back'}`}
              event={shown}
              faces={facesOf(view, viewer, shown)}
              compact={compact}
              onDone={() => clear(shown)}
            />
          ) : (
            <PlayedSpot
              key={`${shown.seq}:${shown.card}`}
              event={shown}
              faces={facesOf(view, viewer, shown)}
              compact={compact}
              stage={stage}
              onDone={() => clear(shown)}
            />
          )}
        </View>
      )}
      {picking && (
        <View style={styles.layer}>
          <PickSpotlight prompt={picking} onRespond={api.respond} compact={compact} />
        </View>
      )}
      {peeking && !picking && (
        <View style={styles.layer}>
          <PeekSpot key={peeking} card={peeking} meta={peekHint(api, peeking)} compact={compact} />
        </View>
      )}
      {/* 카드 위에 그려야 총구 섬광이 카드에 가리지 않는다. 쉬는 동안은 비어 있다 */}
      {hqLayer && <hqLayer.Layer progress={progress} geom={geom} />}
    </View>
  );
}

/**
 * 판 밖(카드 도감)에서 낸 카드 연출을 한 번 돌려 본다. 화질 설정을 그대로 따른다.
 * `run` 이 바뀔 때마다 다시 터지고, 0 이면 아무것도 띄우지 않는다.
 * 부모를 꽉 채우는 레이어라 연출이 그 위에 겹친다.
 */
export function CardFxPreview({ card, run, onDone }: { card: CardId; run: number; onDone: () => void }) {
  const { hqLayer, progress, geom, layer, stage } = useFxStage();
  const event: GameEvent | null =
    run > 0 ? { t: kindOf(card) === 'missed' ? 'playMissed' : 'playCard', card, text: '연출 미리보기', seq: run } : null;
  return (
    <View ref={layer} style={styles.root}>
      {event && (
        <View style={[styles.layer, styles.passThrough]}>
          <PlayedSpot key={run} event={event} faces={null} stage={stage} onDone={onDone} />
        </View>
      )}
      {hqLayer && <hqLayer.Layer progress={progress} geom={geom} />}
    </View>
  );
}

function peekHint(api: PlayedCardSpotlightProps['api'], card: CardId): string {
  if (api.discardable.has(card)) return CAN_HOVER ? '눌러서 버린다' : '한 번 더 누르면 버린다';
  if (api.playable.has(card)) return CAN_HOVER ? '눌러서 낸다' : '한 번 더 누르면 낸다';
  return '지금은 낼 수 없다';
}

/** 양옆에 세울 사람. 부관은 역할이 보일 때만 표시한다 */
type Face = { character: CharacterId; deputy: boolean };
/** 카드 왼쪽에 낸 사람, 오른쪽에 겨눈 사람 */
type Faces = { actor: Face | null; target: Face | null };

function facesOf(view: GameState, viewer: PlayerId, event: GameEvent): Faces | null {
  const characterOf = (pid?: PlayerId): Face | null => {
    const p = view.players.find((q) => q.id === pid);
    if (!p) return null;
    return { character: p.character, deputy: p.role === 'deputy' && roleVisibleTo(viewer, p) };
  };
  const actor = characterOf(event.pid);
  // 뱅!·캣 발루·강탈·결투·감옥처럼 남을 겨눈 카드와 그 결과는 대상도 세운다
  const aimed = event.t === 'playCard' || isTakeEvent(event);
  const target = aimed && event.target && event.target !== event.pid ? characterOf(event.target) : null;
  // 역마차·맥주·장비처럼 혼자 쓰는 카드, 빗나감!, 인디언·결투에 맞선 뱅!은 낸 사람만
  return actor || target ? { actor, target } : null;
}

/** 누가 낸 카드. 튀어 올랐다가 잠시 뒤 사라진다. 연출이 붙은 카드면 올라선 직후 터진다 */
type PlayedSpotProps = {
  event: GameEvent;
  faces: Faces | null;
  compact?: boolean;
  /** 고화질 무대. 없으면 일반 연출 */
  stage: HqStage | null;
  onDone: () => void;
};

function PlayedSpot({ event, faces, compact, stage, onDone }: PlayedSpotProps) {
  const found = cardFxFor(event);
  // 화질은 카드가 뜰 때 한 번 정한다. 도중에 설정이 바뀌어도 연출이 섞이지 않게
  const [hq] = useState(() => (found ? stage : null));
  // 빗나감은 아직 고화질에만 있다
  const fx = found && (found.visual === 'gunshot' || hq) ? found : null;
  // 빗나감은 카드가 튀어 오르지 않는다. 그림 조각이 준비된 뒤에 한꺼번에 나타난다
  const missed = fx?.visual === 'missed';
  const [t] = useState(() => new Animated.Value(missed ? 1 : 0));
  const [shot] = useState(() => new Animated.Value(0));
  const [armed, setArmed] = useState(!missed);
  const anchor = useRef<View>(null);
  const size = compact ? 'lg' : 'xl';
  const dim = CARD_DIMENSIONS[size];
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const scale = Math.max(1, fxPacing.getState().timeScale);
    const fireAt = missed ? 0 : FIRE_DELAY_MS / scale;
    const shotMs = (missed ? MISSED_HQ_MS : hq ? GUNSHOT_HQ_MS : GUNSHOT_MS) / scale;
    // 연출이 끝날 때까지는 떠 있는다
    const hold = Math.max(600, SHOW_MS / scale - 400, fx ? fireAt + shotMs - 200 : 0);
    const anim = Animated.sequence([
      ...(missed ? [] : [Animated.spring(t, { toValue: 1, friction: 6, tension: 140, useNativeDriver: NATIVE_DRIVER })]),
      Animated.delay(hold),
      Animated.timing(t, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });

    let cancelled = false;
    let whiz: ReturnType<typeof setTimeout> | undefined;

    // 일반: 소리와 화면 효과가 같은 틱에서 함께 출발한다
    const fireBasic = () => {
      if (!fx) return;
      playSfx(fx.sfx);
      Animated.timing(shot, { toValue: 1, duration: shotMs, easing: Easing.linear, useNativeDriver: NATIVE_DRIVER }).start();
    };

    // 고화질: 카드가 테이블 캔버스의 어디에 있는지 재고, 소리와 진행도를 같은 틱에 출발시킨다
    const fireHq = (s: HqStage) => {
      void Promise.all([measure(s.layer.current), measure(anchor.current)]).then(([layerBox, cardBox]) => {
        if (cancelled || !fx) return;
        if (layerBox && cardBox) {
          const cx = cardBox.x - layerBox.x + cardBox.w / 2;
          const cy = cardBox.y - layerBox.y + cardBox.h / 2;
          const cw = dim.width;
          const ch = dim.height;
          if (fx.visual === 'gunshot') {
            const mx = cx - cw / 2 + fx.muzzle.x * cw;
            const my = cy - ch / 2 + fx.muzzle.y * ch;
            s.geom.value = { kind: FX_GUNSHOT, cx, cy, cw, ch, mx, my, fx: 0, fy: 0 };
          } else {
            // 원본 그림은 카드에 cover 로 깔린다 (CardView). 얼굴 자리를 카드 가운데 기준으로 바꾼다
            const k = Math.max(cw / 250, ch / 389);
            const fx0 = (fx.focus.x - 0.5) * 250 * k;
            const fy0 = (fx.focus.y - 0.5) * 389 * k;
            s.geom.value = { kind: FX_MISSED, cx, cy, cw, ch, mx: cx, my: cy, fx: fx0, fy: fy0 };
          }
        }
        // 0 이 아닌 작은 값에서 출발한다. 0 과 1 은 "쉬는 중"이라 그림 조각을 덮지 않는다
        s.progress.value = 0.0001;
        s.progress.value = withTiming(1, { duration: shotMs, easing: ReEasing.linear });
        if (fx.visual === 'gunshot') {
          playSfx(fx.sfx);
          // 슬로모션이 풀리며 총알이 날아가는 순간 휘익
          whiz = setTimeout(() => playSfx('bullet_whiz'), RELEASE_MS / scale);
        } else {
          // 스친 총알이 빠져나가는 순간 휘익
          whiz = setTimeout(() => playSfx(fx.sfx), MISSED_RELEASE_MS / scale);
          setArmed(true);
        }
      });
    };

    const fire = fx ? setTimeout(() => (hq ? fireHq(hq) : fireBasic()), fireAt) : undefined;

    return () => {
      cancelled = true;
      anim.stop();
      clearTimeout(fire);
      clearTimeout(whiz);
      shot.stopAnimation();
      if (hq) {
        cancelAnimation(hq.progress);
        // 도중에 끊겼으면 캔버스에 남은 그림을 지운다
        hq.progress.value = 0;
      }
    };
  }, [t, shot, fx, hq, missed, dim.width, dim.height]);

  if (fx && hq) {
    return (
      <Animated.View style={[styles.spot, popStyle(t), !armed && styles.hidden]}>
        <CardSpotlight
          card={event.card!}
          meta={event.text}
          faces={faces}
          compact={compact}
          anchorRef={anchor}
          cardWrap={(card) => (
            <ShotCardWrap progress={hq.progress} geom={hq.geom}>
              {card}
            </ShotCardWrap>
          )}
        />
      </Animated.View>
    );
  }

  return (
    <>
      {fx && <Animated.View style={[styles.screenFlash, screenFlashStyle(shot)]} />}
      <Animated.View style={[styles.spot, popStyle(t)]}>
        <CardSpotlight
          card={event.card!}
          meta={event.text}
          faces={faces}
          compact={compact}
          cardStyle={fx ? recoilStyle(shot) : undefined}
          overlay={fx ? <CardFxOverlay fx={fx} shot={shot} width={dim.width} height={dim.height} compact={compact} /> : null}
        />
      </Animated.View>
    </>
  );
}

function CardFxOverlay({
  fx,
  shot,
  width,
  height,
  compact,
}: {
  fx: CardFx;
  shot: Animated.Value;
  width: number;
  height: number;
  compact?: boolean;
}) {
  switch (fx.visual) {
    case 'gunshot':
      return <GunshotFx shot={shot} width={width} height={height} muzzle={fx.muzzle} compact={compact} />;
  }
}

/** 결과 명판 위 줄 */
const TAKE_TITLE: Record<string, string> = { catBalou: '캣 발루', panic: '강탈', ricochet: '리코체' };

/**
 * 남의 카드를 버리게·가져간 결과. 공개된 카드면 그 카드, 손패에서 뽑았으면 뒷면을 띄운다.
 * 명판에는 엔진 로그 글을 그대로 쓴다
 */
function TakenSpot({ event, faces, compact, onDone }: { event: GameEvent; faces: Faces | null; compact?: boolean; onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const scale = Math.max(1, fxPacing.getState().timeScale);
    const anim = Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 6, tension: 140, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(Math.max(600, SHOW_MS / scale - 400)),
      Animated.timing(t, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => anim.stop();
  }, [t]);

  const card = takenCardOf(event);
  const hiddenNote = event.t === 'panic' ? '손에서 가져간 카드' : '손에서 뽑아 버린 카드';
  return (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <CardSpotlight
        card={card}
        meta={card ? (TAKE_TITLE[event.t] ?? '') : `${TAKE_TITLE[event.t] ?? ''} · ${hiddenNote}`}
        body={event.text}
        faces={faces}
        compact={compact}
      />
    </Animated.View>
  );
}

type RevealRule = {
  title: string;
  /** 나와야 하는 무늬 */
  need: string;
  /** 조건이 맞은 것이 펼친 사람에게 좋은 일인가 */
  hitIsGood: boolean;
  hitText: string;
  missText: string;
  /** 도장 글. 없으면 좋으면 '성공', 나쁘면 '실패' */
  hitStamp?: string;
  missStamp?: string;
};

const JUDGEMENT_RULE: Record<JudgementPurpose, RevealRule> = {
  barrel: { title: '술통 판정', need: '♥', hitIsGood: true, hitText: '빗나감 1회', missText: '막지 못했다' },
  jourdonnais: { title: '주르도네 판정', need: '♥', hitIsGood: true, hitText: '빗나감 1회', missText: '막지 못했다' },
  dynamite: {
    title: '다이너마이트 판정',
    need: '♠ 2~9',
    hitIsGood: false,
    hitText: '펑! 목숨 3을 잃는다',
    missText: '옆 사람에게 넘어간다',
    hitStamp: '펑!',
    missStamp: '불발',
  },
  jail: { title: '감옥 판정', need: '♥', hitIsGood: true, hitText: '탈출', missText: '차례를 건너뛴다' },
  rattlesnake: {
    title: '방울뱀 판정',
    need: '♠',
    hitIsGood: false,
    hitText: '물렸다 — 목숨 1',
    missText: '무사하다',
    hitStamp: '물림',
    missStamp: '무사',
  },
  coloradoBill: { title: '콜로라도 빌', need: '♠', hitIsGood: true, hitText: '피할 수 없는 총알', missText: '평범한 뱅!' },
  donBell: { title: '돈 벨', need: '♥ ♦', hitIsGood: true, hitText: '차례를 한 번 더', missText: '차례가 끝난다' },
  terenKill: { title: '테렌 킬', need: '♠ 말고', hitIsGood: true, hitText: '목숨 1로 버틴다', missText: '쓰러졌다' },
  vendetta: { title: '복수', need: '♥', hitIsGood: true, hitText: '차례를 한 번 더', missText: '차례가 끝난다' },
};

const OTHER_REVEAL_RULE: Record<string, RevealRule> = {
  blackJack: { title: '블랙 잭', need: '♥ ♦', hitIsGood: true, hitText: '한 장 더', missText: '그대로' },
  peyote: { title: '피요테', need: '부른 색', hitIsGood: true, hitText: '맞혔다', missText: '틀렸다' },
};

function revealRuleOf(e: GameEvent): RevealRule {
  const purpose = e.reveal?.purpose;
  if (purpose) return JUDGEMENT_RULE[purpose];
  return OTHER_REVEAL_RULE[e.t] ?? { title: '카드 펼치기', need: '', hitIsGood: true, hitText: '성공', missText: '실패' };
}

/**
 * 판정·블랙 잭·피요테로 펼친 카드. 카드가 올라서면 나온 무늬가 큰 배지로 튀어 오르고,
 * 이어서 성공·실패 도장이 찍힌다. 명판에는 필요한 무늬와 결과, 엔진 로그 글을 적는다
 */
function RevealSpot({ event, faces, compact, onDone }: { event: GameEvent; faces: Faces | null; compact?: boolean; onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));
  const [badge] = useState(() => new Animated.Value(0));
  const [stamp] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const scale = Math.max(1, fxPacing.getState().timeScale);
    const anim = Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 6, tension: 140, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(Math.max(900, REVEAL_SHOW_MS / scale - 400)),
      Animated.timing(t, { toValue: 0, duration: 220, useNativeDriver: NATIVE_DRIVER }),
    ]);
    // 배지 스프링이 다 가라앉기를 기다리지 않고 도장은 제 시간에 찍는다
    const marks = Animated.parallel([
      Animated.sequence([
        Animated.delay(BADGE_DELAY_MS / scale),
        Animated.spring(badge, { toValue: 1, friction: 4, tension: 160, useNativeDriver: NATIVE_DRIVER }),
      ]),
      Animated.sequence([
        Animated.delay((BADGE_DELAY_MS + STAMP_DELAY_MS) / scale),
        Animated.timing(stamp, { toValue: 1, duration: 160, easing: Easing.out(Easing.back(2)), useNativeDriver: NATIVE_DRIVER }),
      ]),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    marks.start();
    return () => {
      anim.stop();
      marks.stop();
    };
  }, [t, badge, stamp]);

  const reveal = event.reveal!;
  const card = event.card!;
  const rule = revealRuleOf(event);
  const good = reveal.hit === rule.hitIsGood;
  const stampText = (reveal.hit ? rule.hitStamp : rule.missStamp) ?? (good ? '성공' : '실패');
  const printed = cardOf(card).suit;
  const dim = CARD_DIMENSIONS[compact ? 'lg' : 'xl'];
  const tone = good ? Colors.success : Colors.danger;

  return (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <CardSpotlight
        card={card}
        meta={rule.need ? `${rule.title} · 필요 ${rule.need}` : rule.title}
        body={
          <>
            <Text style={[plaque.name, { color: tone }]}>{reveal.hit ? rule.hitText : rule.missText}</Text>
            {'  '}
            {event.text}
            {printed !== reveal.suit ? `  (인쇄 무늬 ${SUIT_GLYPH[printed]} → ${SUIT_GLYPH[reveal.suit]})` : ''}
          </>
        }
        faces={faces}
        compact={compact}
        overlay={<RevealMarks suit={reveal.suit} good={good} stampText={stampText} badge={badge} stamp={stamp} width={dim.width} height={dim.height} />}
      />
    </Animated.View>
  );
}

/** 펼친 카드 위에 겹치는 무늬 배지(아래쪽)와 결과 도장(가운데) */
function RevealMarks({
  suit,
  good,
  stampText,
  badge,
  stamp,
  width,
  height,
}: {
  suit: Suit;
  good: boolean;
  stampText: string;
  badge: Animated.Value;
  stamp: Animated.Value;
  width: number;
  height: number;
}) {
  const size = Math.round(width * 0.46);
  const red = RED_SUITS.includes(suit);
  const tone = good ? Colors.success : Colors.danger;
  return (
    <View style={[styles.marks, { width, height }]}>
      <Animated.View
        style={[
          styles.stamp,
          { borderColor: tone, top: height * 0.36 },
          {
            opacity: stamp,
            transform: [{ rotate: '-12deg' }, { scale: stamp.interpolate({ inputRange: [0, 1], outputRange: [1.8, 1] }) }],
          },
        ]}>
        <Text style={[styles.stampText, { color: tone, fontSize: Math.round(width * 0.15) }]}>{stampText}</Text>
      </Animated.View>
      <Animated.View
        style={[
          styles.suitBadge,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            bottom: -size * 0.32,
            borderColor: good ? Colors.highlight : Colors.textMuted,
            boxShadow: good ? `0 0 0 3px ${Colors.highlight}55, 0 0 18px ${Colors.highlight}AA` : '0 4px 10px rgba(0,0,0,0.5)',
          },
          {
            opacity: badge.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 1] }),
            transform: [{ scale: badge.interpolate({ inputRange: [0, 1], outputRange: [0.2, 1] }) }],
          },
        ]}>
        <Text style={[styles.suitGlyph, { color: red ? Colors.suitRed : Colors.suitBlack, fontSize: Math.round(size * 0.66), lineHeight: Math.round(size * 0.8) }]}>
          {SUIT_GLYPH[suit]}
        </Text>
      </Animated.View>
    </View>
  );
}

/** 새로 공개된 이벤트 카드. 낸 카드처럼 튀어 올랐다가, 효과를 읽을 만큼 머문 뒤 사라진다 */
function EventSpot({ def, compact, onDone }: { def: EventCardDef; compact?: boolean; onDone: () => void }) {
  const [t] = useState(() => new Animated.Value(0));
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const scale = Math.max(1, fxPacing.getState().timeScale);
    const hold = Math.max(EVENT_MIN_MS, EVENT_SHOW_MS / scale);
    const anim = Animated.sequence([
      Animated.spring(t, { toValue: 1, friction: 6, tension: 140, useNativeDriver: NATIVE_DRIVER }),
      Animated.delay(hold),
      Animated.timing(t, { toValue: 0, duration: 260, useNativeDriver: NATIVE_DRIVER }),
    ]);
    anim.start(({ finished }) => {
      if (finished) done.current();
    });
    return () => anim.stop();
  }, [t]);

  const width = CARD_DIMENSIONS[compact ? 'lg' : 'xl'].width;
  return (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <View style={styles.cardShadow}>
        <EventCardFace def={def} width={width} />
      </View>
      <PaperPlaque compact={compact} style={compact ? styles.plaqueCompact : styles.plaque}>
        <Text style={plaque.meta} numberOfLines={1}>
          {def.isFinal ? '마지막 이벤트 공개' : '새 이벤트 공개'}
        </Text>
        <Text style={[plaque.text, compact && plaque.textCompact]} numberOfLines={4}>
          <Text style={plaque.name}>{def.nameKo}</Text>
          {'  '}
          {def.text}
        </Text>
      </PaperPlaque>
    </Animated.View>
  );
}

/** 손패에서 살펴보는 카드. 손을 떼거나 다시 누를 때까지 떠 있다. 폰은 창을 누르면 닫힌다 */
function PeekSpot({ card, meta, compact }: { card: CardId; meta: string; compact?: boolean }) {
  const [t] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const anim = Animated.timing(t, { toValue: 1, duration: 140, useNativeDriver: NATIVE_DRIVER });
    anim.start();
    return () => anim.stop();
  }, [t]);

  const body = (
    <Animated.View style={[styles.spot, popStyle(t)]}>
      <CardSpotlight card={card} meta={meta} hint compact={compact} />
    </Animated.View>
  );
  // hover 로 열고 닫으므로 창이 마우스를 가로채면 안 된다
  if (CAN_HOVER) return <View style={styles.passThrough}>{body}</View>;
  return (
    <Pressable onPress={() => setPeek(null)} accessibilityRole="button" accessibilityLabel="카드 설명 닫기">
      {body}
    </Pressable>
  );
}

type CardSpotlightProps = {
  /** null 이면 뒷면 (가려진 카드) */
  card: CardId | null;
  meta: string;
  /** 명판 본문. 없으면 카드 이름과 효과 */
  body?: React.ReactNode;
  /** 양옆에 세울 캐릭터 카드 */
  faces?: Faces | null;
  hint?: boolean;
  compact?: boolean;
  /** 카드에 걸 움직임 (반동 등) */
  cardStyle?: Animated.WithAnimatedValue<StyleProp<ViewStyle>>;
  /** 카드 자리를 잴 때 쓰는 ref (변환이 걸리지 않은 감싸개) */
  anchorRef?: React.RefObject<View | null>;
  /** 카드를 감쌀 움직임 (고화질 연출의 흔들림·확대) */
  cardWrap?: (card: React.ReactNode) => React.ReactNode;
  /** 카드 위에 겹칠 연출 */
  overlay?: React.ReactNode;
};

function CardSpotlight({ card, meta, body, faces, hint, compact, cardStyle, anchorRef, cardWrap, overlay }: CardSpotlightProps) {
  const def = card ? defOf(card) : null;
  const size = compact ? 'lg' : 'xl';
  const cardNode = (
    <Animated.View style={[styles.cardShadow, cardStyle]}>
      {card ? <CardView card={card} size={size} /> : <CardBack size={size} />}
    </Animated.View>
  );
  const played = (
    <View ref={anchorRef}>
      {cardWrap ? cardWrap(cardNode) : cardNode}
      {overlay}
    </View>
  );
  const faceW = compact ? FACE_W_COMPACT : FACE_W;
  // 한쪽만 있어도 빈 칸을 둬서 낸 카드가 가운데에 머문다
  const face = (f: Face | null, side: 'actor' | 'target') => (
    <View style={[{ width: faceW }, f && styles.cardShadow, f && (side === 'actor' ? styles.faceActor : styles.faceTarget)]}>
      {f && <CharacterCard id={f.character} width={faceW} />}
      {f?.deputy && <DeputyStar size={compact ? 26 : 34} />}
    </View>
  );
  return (
    <>
      {faces ? (
        <View style={styles.faceRow}>
          {face(faces.actor, 'actor')}
          {played}
          {face(faces.target, 'target')}
        </View>
      ) : (
        played
      )}
      <PaperPlaque compact={compact} style={compact ? styles.plaqueCompact : styles.plaque}>
        <Text style={[plaque.meta, hint && plaque.hint]} numberOfLines={1}>
          {meta}
        </Text>
        <Text style={[plaque.text, compact && plaque.textCompact]} numberOfLines={3}>
          {body ?? (
            <>
              <Text style={plaque.name}>{def?.nameKo}</Text>
              {'  '}
              {def?.text}
            </>
          )}
        </Text>
      </PaperPlaque>
    </>
  );
}

/** 부관 역할 카드의 별 자리 (원본 250×389 기준) */
const STAR = { cx: 126, cy: 167, span: 176 };

/** 캐릭터 카드 위쪽 가운데에 다는 부관 별. 역할 카드 그림이 없으면 글자 별로 대신한다 */
function DeputyStar({ size }: { size: number }) {
  const art = roleArt('deputy');
  const k = size / STAR.span;
  return (
    <View
      accessibilityLabel="부관"
      style={[styles.star, { width: size, height: size, borderRadius: size / 2, top: -size / 2, marginLeft: -size / 2 }]}>
      {art ? (
        <Image
          source={art}
          style={{ position: 'absolute', width: 250 * k, height: 389 * k, left: size / 2 - STAR.cx * k, top: size / 2 - STAR.cy * k }}
          resizeMode="stretch"
        />
      ) : (
        <Text style={[styles.starGlyph, { fontSize: size * 0.62 }]}>★</Text>
      )}
    </View>
  );
}

type Box = { x: number; y: number; w: number; h: number };

function measure(v: View | null): Promise<Box | null> {
  return new Promise((resolve) => {
    if (!v) return resolve(null);
    v.measureInWindow((x, y, w, h) => resolve(w > 0 ? { x, y, w, h } : null));
  });
}

function popStyle(t: Animated.Value) {
  return {
    opacity: t.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 1] }),
    transform: [
      { translateY: t.interpolate({ inputRange: [0, 1], outputRange: [24, 0] }) },
      { scale: t.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) },
    ],
  };
}

const styles = StyleSheet.create({
  root: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'box-none' },
  // 좌석·손패 입력을 가로막지 않는다
  layer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    pointerEvents: 'box-none',
  },
  passThrough: { pointerEvents: 'none' },
  hidden: { opacity: 0 },
  screenFlash: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF6DA' },
  spot: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  cardShadow: { borderRadius: 8, boxShadow: '0 12px 28px rgba(0,0,0,0.6)' },
  faceRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  faceActor: { transform: [{ rotate: '-5deg' }] },
  faceTarget: { transform: [{ rotate: '5deg' }] },
  star: {
    position: 'absolute',
    left: '50%',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paper,
    borderWidth: 2,
    borderColor: Colors.deputy,
    boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
  },
  starGlyph: { color: Colors.deputy, fontWeight: '900' },
  marks: { position: 'absolute', top: 0, left: 0, alignItems: 'center', pointerEvents: 'none' },
  suitBadge: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.paper,
    borderWidth: 4,
  },
  suitGlyph: { fontWeight: '900', textAlign: 'center' },
  stamp: {
    position: 'absolute',
    paddingHorizontal: Spacing.two,
    paddingVertical: 2,
    borderWidth: 3,
    borderRadius: 6,
    backgroundColor: 'rgba(239,226,198,0.88)',
  },
  stampText: { fontWeight: '900', letterSpacing: 2 },
  plaque: { width: 340, gap: 2 },
  plaqueCompact: { width: 260, gap: 1 },
});
