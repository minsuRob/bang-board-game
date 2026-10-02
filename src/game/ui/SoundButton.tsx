/**
 * 효과음 켜기/끄기 + 볼륨. 기기마다 따로 정한다 (웹은 다음에 와도 기억한다).
 *
 * 버튼에 마우스를 올리면(hover) 버튼 위로 세로 슬라이더가 뜬다.
 * 위로 드래그하면 100, 아래로 내리면 0. 누르면 음소거 토글.
 * 폰에는 hover 가 없으니 첫 탭이 슬라이더를 열고, 열린 채로 다시 탭하면 음소거 토글.
 * 손대지 않으면 3초 뒤 닫힌다.
 */

import { useEffect, useRef, useState } from 'react';
import {
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PanResponderGestureState,
  type StyleProp,
  type ViewProps,
  type ViewStyle,
} from 'react-native';
import { useStore } from 'zustand';

import { CAN_HOVER } from './card-peek';
import { setMuted, setVolume, sfxSettings } from './sfx';
import { Colors, Radius, Spacing } from '@/constants/theme';

/** 폰에서 탭으로 연 슬라이더를 닫기까지 (ms) */
const TAP_CLOSE_MS = 3000;

/** 슬라이더 트랙 높이(px). 이 높이 안에서 위=100, 아래=0. */
const TRACK_HEIGHT = 120;

export function SoundButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const muted = useStore(sfxSettings, (s) => s.muted);
  const volume = useStore(sfxSettings, (s) => s.volume);
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);

  // 드래그 시작 시점의 볼륨을 기준으로 이동량을 더한다.
  const startVolume = useRef(volume);

  // 위로 갈수록(=dy 음수) 볼륨이 커지도록 한다. 트랙 전체 높이가 0~100에 대응.
  const volumeFromDy = (dy: number) => {
    const delta = (-dy / TRACK_HEIGHT) * 100;
    return startVolume.current + delta;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        startVolume.current = sfxSettings.getState().volume;
        setDragging(true);
      },
      onPanResponderMove: (_e: GestureResponderEvent, g: PanResponderGestureState) => {
        setVolume(volumeFromDy(g.dy));
      },
      onPanResponderRelease: () => setDragging(false),
      onPanResponderTerminate: () => setDragging(false),
    }),
  ).current;

  const showSlider = hovered || dragging;
  const fillPct = muted ? 0 : volume;

  // 버튼 → 슬라이더로 옮겨 가는 사이 잠깐 벗어나도 바로 닫히지 않게 약간 늦게 닫는다.
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelLeave = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    leaveTimer.current = null;
  };
  useEffect(() => cancelLeave, []);

  // 폰: 탭으로 연 슬라이더는 드래그가 끝나고 잠시 뒤 닫는다
  useEffect(() => {
    if (CAN_HOVER || !hovered || dragging) return;
    const t = setTimeout(() => setHovered(false), TAP_CLOSE_MS);
    return () => clearTimeout(t);
  }, [hovered, dragging, volume]);

  const onPress = () => {
    if (!CAN_HOVER && !hovered) return setHovered(true);
    setMuted(!muted);
  };

  // react-native-web 에서만 있는 hover 이벤트. RN 네이티브 타입엔 없어 따로 얹는다.
  const hoverProps = (CAN_HOVER ? {
    onMouseEnter: () => {
      cancelLeave();
      setHovered(true);
    },
    onMouseLeave: () => {
      cancelLeave();
      leaveTimer.current = setTimeout(() => setHovered(false), 250);
    },
  } : {}) as unknown as ViewProps;

  return (
    <View style={styles.wrap} {...hoverProps}>
      {showSlider && (
        // 바깥 View 의 paddingTop 이 버튼과 패널 사이 틈을 메워 hover 가 끊기지 않는다.
        <View style={styles.sliderPop}>
          <View style={styles.sliderPanel}>
            <Text style={styles.readout}>{Math.round(volume)}</Text>
            <View
              style={[styles.track, { cursor: 'ns-resize' } as unknown as ViewStyle]}
              {...panResponder.panHandlers}>
              <View style={[styles.fill, { height: `${fillPct}%` }]} />
              <View style={[styles.thumb, { bottom: `${fillPct}%` }]} />
            </View>
          </View>
        </View>
      )}
      <Pressable
        style={[styles.root, muted && styles.muted, style]}
        accessibilityRole="button"
        accessibilityState={{ selected: !muted }}
        accessibilityLabel={muted ? '소리 켜기' : '소리 끄기'}
        onPress={onPress}>
        <Text style={styles.text}>{muted ? '🔇' : '🔊'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
    alignItems: 'center',
  },
  root: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: 3,
  },
  muted: { opacity: 0.7 },
  text: { fontSize: 13 },

  // 버튼 아래로 떠오르는 세로 슬라이더 패널
  sliderPop: {
    position: 'absolute',
    top: '100%',
    paddingTop: Spacing.one,
    zIndex: 10,
  },
  sliderPanel: {
    alignItems: 'center',
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  readout: {
    color: Colors.text,
    fontSize: 11,
    marginBottom: Spacing.one,
    fontVariant: ['tabular-nums'],
  },
  track: {
    width: 8,
    height: TRACK_HEIGHT,
    borderRadius: Radius.pill,
    backgroundColor: Colors.border,
    justifyContent: 'flex-end',
  },
  fill: {
    width: '100%',
    borderRadius: Radius.pill,
    backgroundColor: Colors.highlight,
  },
  thumb: {
    position: 'absolute',
    left: -4,
    width: 16,
    height: 16,
    marginBottom: -8,
    borderRadius: 8,
    backgroundColor: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
