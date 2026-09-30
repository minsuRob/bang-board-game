/**
 * 전체 화면 켜기/끄기. 모바일 웹(손가락으로 누르는 기기)에서만 보인다.
 *
 * 주소창·탭 바가 판을 가리지 않게 Fullscreen API 로 문서 전체를 올린다.
 * expo-router 의 화면 이동은 새로고침이 아니라서, 첫 화면에서 켜면 판까지 그대로 이어진다.
 *
 * iPhone Safari 처럼 요소 전체 화면을 지원하지 않는 브라우저에서는 버튼을 숨긴다.
 * 정적 렌더(output: static)와 첫 화면이 어긋나지 않게 서버 쪽 값은 늘 '없음'으로 둔다.
 */

import { useSyncExternalStore } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Radius, Spacing } from '@/constants/theme';

// Safari(iPad 포함)는 아직 webkit 접두사 API 만 있는 버전이 남아 있다.
type FsDocument = Document & {
  webkitFullscreenEnabled?: boolean;
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

function fsDocument(): FsDocument | null {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;
  return document as FsDocument;
}

function isFullscreen(d: FsDocument): boolean {
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

/** 이 기기에서 버튼을 보여 줄지. 전체 화면을 지원하고, 손가락으로 누르는 기기일 때만. */
function shouldOffer(d: FsDocument): boolean {
  const enabled = !!(d.fullscreenEnabled || d.webkitFullscreenEnabled);
  const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  return enabled && touch;
}

async function toggleFullscreen(): Promise<void> {
  const d = fsDocument();
  if (!d) return;
  try {
    if (isFullscreen(d)) {
      if (d.exitFullscreen) await d.exitFullscreen();
      else await d.webkitExitFullscreen?.();
    } else {
      const el = d.documentElement as FsElement;
      if (el.requestFullscreen) await el.requestFullscreen({ navigationUI: 'hide' });
      else await el.webkitRequestFullscreen?.();
    }
  } catch {
    // 브라우저가 막았다(권한·제스처 조건). 버튼 모양은 fullscreenchange 가 맞춘다.
  }
}

/** 전체 화면이 켜지고 꺼질 때(버튼·뒤로 가기·Esc) 알린다. */
function subscribe(onChange: () => void): () => void {
  const d = fsDocument();
  if (!d) return () => {};
  d.addEventListener('fullscreenchange', onChange);
  d.addEventListener('webkitfullscreenchange', onChange);
  return () => {
    d.removeEventListener('fullscreenchange', onChange);
    d.removeEventListener('webkitfullscreenchange', onChange);
  };
}

const readActive = () => {
  const d = fsDocument();
  return !!d && isFullscreen(d);
};
const readAvailable = () => {
  const d = fsDocument();
  return !!d && shouldOffer(d);
};
// 정적 렌더와 하이드레이션 첫 그림은 버튼 없이. 브라우저 값은 그 다음 그림에 반영된다.
const onServer = () => false;

/** 버튼을 띄울지와 지금 전체 화면인지. 브라우저가 바꾼 상태도 따라간다. */
export function useFullscreen() {
  const available = useSyncExternalStore(subscribe, readAvailable, onServer);
  const active = useSyncExternalStore(subscribe, readActive, onServer);
  return { available, active, toggle: toggleFullscreen };
}

// 네 모서리 괄호. 켜기는 바깥으로, 끄기는 안쪽으로 꺾인다.
const ENTER_PATH = 'M3 8V3h5 M13 3h5v5 M18 13v5h-5 M8 18H3v-5';
const EXIT_PATH = 'M8 3v5H3 M18 8h-5V3 M13 18v-5h5 M3 13h5v5';

export function FullscreenButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { available, active, toggle } = useFullscreen();
  if (!available) return null;

  return (
    <Pressable
      style={[styles.root, active && styles.active, style]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={active ? '전체 화면 끄기' : '전체 화면'}
      onPress={() => void toggle()}>
      <Svg width={14} height={14} viewBox="0 0 21 21">
        <Path
          d={active ? EXIT_PATH : ENTER_PATH}
          stroke={active ? Colors.paper : Colors.text}
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: Colors.surfaceRaised,
    borderRadius: Radius.pill,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.two,
    paddingVertical: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  active: { backgroundColor: Colors.cardBrown, borderColor: Colors.highlight },
});
