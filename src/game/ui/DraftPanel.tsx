/**
 * 캐릭터 드래프트 패널.
 *
 * 게임 시작 직후 하단 HUD 자리를 대신 차지한다. 후보 위에 마우스를 올리면(폰은 한 번 탭)
 * 카드가 들리고 기울며, 그 hover 가 남의 화면 3D 테이블에도 그대로 비친다.
 * 웹은 클릭, 폰은 같은 카드를 한 번 더 탭하면 고른다.
 */

import { useEffect, useState, useSyncExternalStore } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { CHARACTERS } from '../data/characters';
import type { CharacterId } from '../data/types';
import type { PlayerId } from '../engine';
import { draftUi, setDraftHover } from '../store/draft-ui';
import { TIME_LIMIT_MS } from '../store/online-driver';
import { CharacterCard } from './CharacterCard';
import type { DraftInfo } from './use-table';
import { Colors, Radius, Spacing } from '@/constants/theme';

const WEB = Platform.OS === 'web';

export type DraftPanelProps = {
  draft: DraftInfo;
  viewer: PlayerId;
  onPick: (id: CharacterId) => void;
  compact?: boolean;
};

export function DraftPanel({ draft, viewer, onPick, compact }: DraftPanelProps) {
  const hover = useSyncExternalStore(
    draftUi.subscribe,
    () => draftUi.getState().hover[viewer] ?? null,
    () => null,
  );
  const left = useCountdown();
  const pickedIndex = draft.picked ? draft.offers.indexOf(draft.picked) : -1;

  // 고른 뒤에는 hover 를 내린다 (남의 화면에서는 고른 카드가 들린 채로 남는다)
  useEffect(() => {
    if (draft.picked) setDraftHover(viewer, null);
  }, [draft.picked, viewer]);
  useEffect(() => () => setDraftHover(viewer, null), [viewer]);

  const focus = pickedIndex >= 0 ? pickedIndex : hover;
  const focused = focus !== null ? draft.offers[focus] : null;

  const press = (i: number) => {
    if (draft.picked) return;
    // 폰에는 hover 가 없다. 첫 탭은 들어 보기, 같은 카드를 다시 탭하면 고르기
    if (!WEB && hover !== i) {
      setDraftHover(viewer, i);
      return;
    }
    onPick(draft.offers[i]);
  };

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={styles.title}>{draft.picked ? '다른 사람을 기다린다' : '캐릭터를 고른다'}</Text>
        <Text style={styles.progress}>
          {draft.done}/{draft.total}명 완료
        </Text>
        {left !== null && (
          <Text style={[styles.timer, left <= 5 && styles.timerUrgent]}>{left}초</Text>
        )}
      </View>

      <View style={styles.row}>
        {draft.offers.map((id, i) => (
          <OfferCard
            key={id}
            id={id}
            compact={compact}
            lifted={hover === i || pickedIndex === i}
            picked={pickedIndex === i}
            dimmed={pickedIndex >= 0 && pickedIndex !== i}
            disabled={Boolean(draft.picked)}
            onHoverIn={() => !draft.picked && setDraftHover(viewer, i)}
            onHoverOut={() => !draft.picked && hover === i && setDraftHover(viewer, null)}
            onPress={() => press(i)}
          />
        ))}
      </View>

      <Text style={styles.ability} numberOfLines={2}>
        {focused
          ? `${CHARACTERS[focused].nameKo} — ${CHARACTERS[focused].ability}`
          : WEB
            ? '카드에 마우스를 올려 능력을 보고, 눌러서 고른다'
            : '카드를 눌러 능력을 보고, 한 번 더 눌러 고른다'}
      </Text>
    </View>
  );
}

type OfferCardProps = {
  id: CharacterId;
  compact?: boolean;
  lifted: boolean;
  picked: boolean;
  dimmed: boolean;
  disabled: boolean;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onPress: () => void;
};

function OfferCard({ id, compact, lifted, picked, dimmed, disabled, onHoverIn, onHoverOut, onPress }: OfferCardProps) {
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
      accessibilityLabel={`${CHARACTERS[id].nameKo} 고르기`}>
      <Animated.View style={[styles.offer, { transform }, lifted && styles.offerLifted, dimmed && styles.dimmed]}>
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

const styles = StyleSheet.create({
  root: { paddingVertical: Spacing.two, paddingHorizontal: Spacing.three, gap: Spacing.two, alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.three },
  title: { color: Colors.text, fontSize: 16, fontWeight: '800' },
  progress: { color: Colors.textMuted, fontSize: 12, fontWeight: '700' },
  timer: { color: Colors.highlight, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'] },
  timerUrgent: { color: Colors.danger },
  row: { flexDirection: 'row', gap: Spacing.three, paddingTop: Spacing.three, justifyContent: 'center' },
  offer: { borderRadius: Radius.md },
  offerLifted: { boxShadow: `0 10px 24px rgba(0,0,0,0.55), 0 0 0 2px ${Colors.highlight}` },
  dimmed: { opacity: 0.4 },
  check: {
    position: 'absolute',
    top: -10,
    right: -10,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkText: { color: '#fff', fontSize: 18, fontWeight: '900', lineHeight: 20 },
  ability: { color: Colors.textMuted, fontSize: 12, textAlign: 'center', maxWidth: 560, minHeight: 32 },
});
