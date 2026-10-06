/**
 * 캐릭터 드래프트 패널.
 *
 * 게임 시작 직후 하단 HUD 자리를 대신 차지한다. 후보 위에 마우스를 올리면(폰은 탭)
 * 카드가 들리고 기울며, 그 hover 가 남의 화면 3D 테이블에도 그대로 비친다.
 * 카드를 누르면 선택만 되고, 확정 버튼을 눌러야 고른 것이 된다. 확정 전에는 바꿀 수 있다.
 * 확정하지 못한 채 시계가 다 가면 선택해 둔 카드로 확정한다.
 */

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Platform, Pressable, Text, View } from 'react-native';

import { CHARACTERS } from '../data/characters';
import type { CharacterId } from '../data/types';
import type { PlayerId } from '../engine';
import { draftUi, setDraftHover } from '../store/draft-ui';
import { TIME_LIMIT_MS } from '../store/online-driver';
import { CAN_HOVER } from './card-peek';
import { CharacterCard } from './CharacterCard';
import { PaperPlaque, plaque } from './PaperPlaque';
import type { DraftInfo } from './use-table';
import { WesternFonts } from './menu/western-fonts';
import { themedStyles } from './theme/use-theme';
import { useT } from '../../i18n/use-t';
import { Radius, Spacing } from '@/constants/theme';
import { useNames } from '../../i18n/use-names';

/** 마우스로 올려 볼 수 있는 화면. 폰 브라우저는 앱처럼 첫 탭이 보기다 */
const WEB = CAN_HOVER;

export type DraftPanelProps = {
  draft: DraftInfo;
  viewer: PlayerId;
  onPick: (id: CharacterId) => void;
  compact?: boolean;
};

export function DraftPanel({ draft, viewer, onPick, compact }: DraftPanelProps) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const hover = useSyncExternalStore(
    draftUi.subscribe,
    () => draftUi.getState().hover[viewer] ?? null,
    () => null,
  );
  const left = useCountdown();
  const pickedIndex = draft.picked ? draft.offers.indexOf(draft.picked) : -1;
  const [selected, setSelected] = useState<number | null>(null);

  // 고른 뒤에는 hover 를 내린다 (남의 화면에서는 고른 카드가 들린 채로 남는다)
  useEffect(() => {
    if (draft.picked) setDraftHover(viewer, null);
  }, [draft.picked, viewer]);
  useEffect(() => () => setDraftHover(viewer, null), [viewer]);

  const focus = pickedIndex >= 0 ? pickedIndex : (hover ?? selected);
  const focused = focus !== null ? draft.offers[focus] : null;

  const press = (i: number) => {
    if (draft.picked) return;
    setSelected(i);
    setDraftHover(viewer, i);
  };

  const confirm = () => {
    if (draft.picked || selected === null) return;
    onPick(draft.offers[selected]);
  };

  // 시계가 거의 다 갔는데 선택만 해 두었으면 그 카드로 확정한다 (안 그러면 기본 선택이 된다)
  const autoConfirmed = useRef(false);
  useEffect(() => {
    if (autoConfirmed.current || left === null || left > 1 || draft.picked || selected === null) return;
    autoConfirmed.current = true;
    onPick(draft.offers[selected]);
  }, [left, draft.picked, draft.offers, selected, onPick]);

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{draft.picked ? t.ui.draft.waiting : t.ui.draft.pick}</Text>
        <Text style={styles.progress}>
          {t.ui.draft.done(draft.done, draft.total)}
        </Text>
        {left !== null && (
          <Text style={[styles.timer, left <= 5 && styles.timerUrgent]}>{t.ui.draft.seconds(left)}</Text>
        )}
      </View>

      <View style={styles.row}>
        {draft.offers.map((id, i) => (
          <OfferCard
            key={id}
            id={id}
            compact={compact}
            lifted={hover === i || pickedIndex === i || (pickedIndex < 0 && selected === i)}
            picked={pickedIndex === i}
            selected={pickedIndex < 0 && selected === i}
            dimmed={pickedIndex >= 0 && pickedIndex !== i}
            disabled={Boolean(draft.picked)}
            onHoverIn={() => !draft.picked && setDraftHover(viewer, i)}
            onHoverOut={() => !draft.picked && hover === i && setDraftHover(viewer, selected)}
            onPress={() => press(i)}
          />
        ))}
      </View>

      <View style={[styles.footer, compact && styles.footerCompact]}>
        <PaperPlaque compact={compact} style={[styles.plaque, compact && styles.plaqueCompact]}>
          {focused ? (
            <Text style={[plaque.text, compact && plaque.textCompact]} numberOfLines={2}>
              <Text style={plaque.name}>{names.charName(focused)}</Text>
              {'  '}
              {names.charAbility(focused)}
            </Text>
          ) : (
            <Text style={[plaque.text, plaque.hint, compact && plaque.textCompact]} numberOfLines={2}>
              {WEB ? t.ui.draft.hintMouse : t.ui.draft.hintTouch}
            </Text>
          )}
        </PaperPlaque>
        {!draft.picked && (
          <ConfirmButton
            label={t.ui.draft.confirm}
            accessibilityLabel={
              selected !== null ? t.ui.draft.confirmLabel(names.charName(draft.offers[selected])) : t.ui.draft.confirm
            }
            disabled={selected === null}
            onPress={confirm}
          />
        )}
      </View>
    </View>
  );
}

/** 빨간 도장 버튼 (ActionBar 의 주 버튼과 같은 모양). 고르기 전에는 흐리게 눌리지 않는다 */
function ConfirmButton({
  label,
  accessibilityLabel,
  disabled,
  onPress,
}: {
  label: string;
  accessibilityLabel: string;
  disabled: boolean;
  onPress: () => void;
}) {
  const styles = useStyles();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.stamp, pressed && styles.stampPressed, disabled && styles.stampDisabled]}>
      <View style={styles.stampInner}>
        <Text style={styles.stampText}>{label}</Text>
      </View>
    </Pressable>
  );
}

type OfferCardProps = {
  id: CharacterId;
  compact?: boolean;
  lifted: boolean;
  picked: boolean;
  /** 확정 전에 골라 둔 카드 */
  selected: boolean;
  dimmed: boolean;
  disabled: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onPress: () => void;
};

function OfferCard({
  id,
  compact,
  lifted,
  picked,
  selected,
  dimmed,
  disabled,
  onHoverIn,
  onHoverOut,
  onPress,
}: OfferCardProps) {
  const styles = useStyles();
  const t = useT();
  const names = useNames();
  const [lift] = useState(() => new Animated.Value(0));
  useEffect(() => {
    Animated.spring(lift, {
      toValue: lifted ? 1 : 0,
      friction: 6,
      tension: 120,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [lifted, lift]);

  const transform = [
    { perspective: 700 },
    { translateY: lift.interpolate({ inputRange: [0, 1], outputRange: [0, -18] }) },
    { rotateX: lift.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '14deg'] }) },
    { scale: lift.interpolate({ inputRange: [0, 1], outputRange: [1, 1.07] }) },
  ];

  return (
    <Pressable
      onPress={onPress}
      onHoverIn={onHoverIn}
      onHoverOut={onHoverOut}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={t.ui.draft.pickLabel(names.charName(id))}>
      <Animated.View
        style={[
          styles.offer,
          { transform },
          lifted && styles.offerLifted,
          selected && styles.offerSelected,
          dimmed && styles.dimmed,
        ]}>
        <CharacterCard id={id} compact={compact} />
        {picked && (
          <View style={styles.check}>
            <Text style={styles.checkText}>✓</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/** 남은 초. 드래프트 시계가 없으면 null */
function useCountdown(): number | null {
  const startedAt = useSyncExternalStore(
    draftUi.subscribe,
    () => draftUi.getState().startedAt,
    () => null,
  );
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);
  if (startedAt === null) return null;
  return Math.max(0, Math.ceil((startedAt + TIME_LIMIT_MS.draft - now) / 1000));
}

// 후보 카드와 명판(PaperPlaque)은 판의 종이라 고정색, 둘레 글자와 테는 테마를 따른다
const useStyles = themedStyles((c) => ({
  root: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, gap: Spacing.two, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  title: { color: c.heading, fontSize: 16, fontWeight: '800', fontFamily: WesternFonts.label },
  progress: { color: c.textMuted, fontSize: 12, fontWeight: '700' },
  timer: {
    color: c.highlight,
    fontSize: 16,
    fontWeight: '900',
    fontFamily: WesternFonts.type,
    fontVariant: ['tabular-nums'],
  },
  timerUrgent: { color: c.danger },
  row: { flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.three, justifyContent: 'center' },
  offer: { borderRadius: Radius.md },
  offerLifted: { boxShadow: `0 10px 24px ${c.shadow}, 0 0 0 2px ${c.selectedBorder}` },
  offerSelected: { boxShadow: `0 10px 24px ${c.shadow}, 0 0 0 3px ${c.accent}` },
  dimmed: { opacity: 0.4 },
  check: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: c.success,
    borderWidth: 2,
    borderColor: c.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: c.onAccent, fontSize: 18, fontWeight: '900', lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  footerCompact: { gap: Spacing.two, alignSelf: 'stretch', justifyContent: 'center' },
  // 크기는 고정해 hover 할 때 높이가 튀지 않게 한다
  plaque: { minWidth: 320, minHeight: 52 },
  plaqueCompact: { minWidth: 0, minHeight: 44, flexShrink: 1 },
  // 빨간 도장: 안쪽 점선 테두리, 아래로 떨어지는 짙은 그림자 (ActionBar 와 같다)
  stamp: {
    backgroundColor: c.accent,
    borderRadius: Radius.sm + 2,
    padding: 3,
    boxShadow: `0 3px 0 ${c.accentShadow}, 0 6px 12px ${c.shadow}`,
  },
  stampPressed: { transform: [{ translateY: 2 }], boxShadow: `0 1px 0 ${c.accentShadow}, 0 3px 6px ${c.shadow}` },
  stampDisabled: { opacity: 0.4, boxShadow: 'none' },
  stampInner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(251,246,234,0.6)',
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    alignItems: 'center',
  },
  stampText: { color: c.onAccent, fontSize: 14, fontWeight: '900', letterSpacing: 1, fontFamily: WesternFonts.label },
}));
