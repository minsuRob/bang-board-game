/**
 * 전체 화면 켜기/끄기. 모바일 웹(손가락으로 누르는 기기)에서만 보인다.
 *
 * 주소창·탭 바가 판을 가리지 않게 Fullscreen API 로 문서 전체를 올린다.
 * expo-router 의 화면 이동은 새로고침이 아니라서, 첫 화면에서 켜면 판까지 그대로 이어진다.
 *
 * iPhone 은 Safari·Chrome 모두 요소 전체 화면이 없다. 대신 버튼을 누르면 "홈 화면에 추가" 길을 알려 준다.
 * 홈 화면에서 열면 주소창 없이 뜬다(+html.tsx 의 apple-mobile-web-app-capable). 그렇게 열려 있으면 버튼을 숨긴다.
 * 정적 렌더(output: static)와 첫 화면이 어긋나지 않게 서버 쪽 값은 늘 '없음'으로 둔다.
 */

import { useState, useSyncExternalStore } from 'react';
import { Modal, Platform, Pressable, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { PaperHeading, PaperSheet, usePaperText } from './menu/PaperUi';
import { WesternFonts } from './menu/western-fonts';
import { useToolbarStyles } from './theme/toolbar';
import { themedStyles, useColors } from './theme/use-theme';

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

/** 버튼이 하는 일. api 는 진짜 전체 화면, homescreen 은 iPhone 에 홈 화면 추가 안내, none 은 버튼 없음. */
type Mode = 'api' | 'homescreen' | 'none';

/** 홈 화면 아이콘으로 열어 이미 주소창이 없는지 */
function isStandalone(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return !!nav.standalone || !!window.matchMedia?.('(display-mode: standalone)').matches;
}

/** 이 기기에서 버튼을 어떻게 띄울지. 손가락으로 누르는 기기일 때만 띄운다. */
function offerMode(d: FsDocument): Mode {
  const touch = typeof window !== 'undefined' && !!window.matchMedia?.('(pointer: coarse)').matches;
  if (!touch) return 'none';
  if (d.fullscreenEnabled || d.webkitFullscreenEnabled) return 'api';
  if (/iPhone|iPod/.test(navigator.userAgent) && !isStandalone()) return 'homescreen';
  return 'none';
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
const readMode = (): Mode => {
  const d = fsDocument();
  return d ? offerMode(d) : 'none';
};
// 정적 렌더와 하이드레이션 첫 그림은 버튼 없이. 브라우저 값은 그 다음 그림에 반영된다.
const onServer = () => false;
const modeOnServer = (): Mode => 'none';

/** 버튼을 어떻게 띄울지와 지금 전체 화면인지. 브라우저가 바꾼 상태도 따라간다. */
export function useFullscreen() {
  const mode = useSyncExternalStore(subscribe, readMode, modeOnServer);
  const active = useSyncExternalStore(subscribe, readActive, onServer);
  return { mode, active, toggle: toggleFullscreen };
}

// 네 모서리 괄호. 켜기는 바깥으로, 끄기는 안쪽으로 꺾인다.
const ENTER_PATH = 'M3 8V3h5 M13 3h5v5 M18 13v5h-5 M8 18H3v-5';
const EXIT_PATH = 'M8 3v5H3 M18 8h-5V3 M13 18v-5h5 M3 13h5v5';

export function FullscreenButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { mode, active, toggle } = useFullscreen();
  const [hintOpen, setHintOpen] = useState(false);
  const toolbar = useToolbarStyles();
  const c = useColors();
  if (mode === 'none') return null;

  return (
    <>
      <Pressable
        style={({ hovered }: { hovered?: boolean }) => [
          toolbar.pill,
          hovered && !active && toolbar.pillHover,
          active && toolbar.pillActive,
          style,
        ]}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={active ? '전체 화면 끄기' : '전체 화면'}
        onPress={() => (mode === 'api' ? void toggle() : setHintOpen(true))}>
        <Svg width={14} height={14} viewBox="0 0 21 21">
          <Path
            d={active ? EXIT_PATH : ENTER_PATH}
            stroke={active ? c.onSelected : c.text}
            strokeWidth={2.4}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </Svg>
      </Pressable>
      {hintOpen && <HomeScreenHint onClose={() => setHintOpen(false)} />}
    </>
  );
}

/** iPhone 용 안내. 설정 창 안에서 눌러도 맨 위에 뜨도록 Modal 로 띄운다. */
function HomeScreenHint({ onClose }: { onClose: () => void }) {
  const styles = useHintStyles();
  const text = usePaperText();
  return (
    <Modal transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.layer}>
        <Pressable accessibilityRole="button" accessibilityLabel="안내 닫기" onPress={onClose} style={styles.scrim} />
        <PaperSheet style={styles.sheet}>
          <PaperHeading eyebrow="FULL SCREEN" title="전체 화면" />
          <Text style={styles.body}>
            iPhone 브라우저는 웹 페이지를 전체 화면으로 띄우지 못한다. 홈 화면에 추가해서 열면 주소창 없이 판을 볼 수
            있다.
          </Text>
          <View style={styles.steps}>
            <Text style={styles.step}>1. 공유 버튼을 누른다 (사파리는 ⋯ 안, 크롬은 주소창 옆)</Text>
            <Text style={styles.step}>2. 홈 화면에 추가를 고른다</Text>
            <Text style={styles.step}>3. 홈 화면의 BANG! 아이콘으로 연다</Text>
          </View>
          <Text style={text.hint}>홈 화면에서 연 판은 저장·설정이 브라우저와 따로 간다.</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="닫기" onPress={onClose} style={styles.close}>
            <Text style={styles.closeText}>닫기</Text>
          </Pressable>
        </PaperSheet>
      </View>
    </Modal>
  );
}

const useHintStyles = themedStyles((c) => ({
  layer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: c.scrim,
  },
  sheet: { width: '100%', maxWidth: 400, gap: 16, backgroundColor: c.surface },
  body: {
    color: c.text,
    fontSize: 14.5,
    lineHeight: 22,
    fontFamily: WesternFonts.body,
  },
  steps: { gap: 6 },
  step: {
    color: c.text,
    fontSize: 14.5,
    fontWeight: '800',
    fontFamily: WesternFonts.label,
  },
  close: {
    alignSelf: 'center',
    paddingHorizontal: 28,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: c.chipBorder,
  },
  closeText: {
    color: c.text,
    fontSize: 15,
    fontWeight: '800',
    fontFamily: WesternFonts.label,
  },
}));
