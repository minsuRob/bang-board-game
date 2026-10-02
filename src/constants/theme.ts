/**
 * 뱅! 서부극 테마.
 *
 * 색은 두 갈래다.
 * - `Colors`: 판(3D 테이블 텍스처·지오메트리, 2D 좌석·테이블, 카드 앞면)이 쓰는 고정 팔레트.
 *   게임 테이블은 늘 어두운 살롱 톤이다. 원본 SC2 아케이드 맵의 레이아웃 캡처
 *   (reference/sc2-arcade/images/screenshot_25aad3a471f5.jpg)처럼 낡은 종이/나무 질감 위에
 *   카드가 놓인 느낌을 색으로만 흉내낸다.
 * - `Palettes.light` / `Palettes.dark`: 그 밖의 UI(메뉴, 버튼, 기록, 팝업)가 쓰는 테마 팔레트.
 *   라이트는 종이와 잉크, 다크는 밤 살롱이다. UI 는 `useColors()` / `themedStyles()`
 *   (src/game/ui/theme/use-theme.ts)로 읽어야 설정에서 테마를 바꿀 때 같이 바뀐다.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  /** 화면 바탕 (어두운 나무) */
  background: '#1B120B',
  /** 테이블 펠트 */
  table: '#2E2013',
  /** 패널/카드 뒷면 */
  surface: '#3A2A1A',
  surfaceRaised: '#4A3722',
  /** 낡은 종이 (카드 앞면) */
  paper: '#EFE2C6',
  paperEdge: '#C9B48A',

  text: '#F3E7CE',
  textMuted: '#B39B74',
  textOnPaper: '#2B1D10',

  /** 카드 테두리: 갈색(즉시 사용) / 파랑(장착) */
  cardBrown: '#8B5A2B',
  cardBlue: '#3D6E9E',

  /** 무늬 */
  suitRed: '#B3261E',
  suitBlack: '#241A12',

  /** 역할 */
  sheriff: '#D4A017',
  deputy: '#4E8AC7',
  outlaw: '#B3261E',
  renegade: '#7E57C2',

  /** 상태 */
  hp: '#D9A441',
  danger: '#C0392B',
  success: '#4C9A5A',
  /** 지금 차례인 플레이어 */
  activeTurn: '#4FB35E',
  /** 온라인 접속 상태: 보는 중 / 자리 비움 / 나감 */
  presenceActive: '#43C059',
  presenceAway: '#F2C94C',
  presenceLeft: '#E0453A',
  highlight: '#F2C14E',
  border: '#5C452C',
  overlay: 'rgba(12, 8, 4, 0.78)',
} as const;

export type ThemeColor = keyof typeof Colors;

/** 테마 팔레트. 판 팔레트의 이름을 그대로 쓰고, UI 에만 필요한 이름을 더한다 */
export type ThemeColors = { [K in ThemeColor]: string } & {
  /** 판 위에 얹는 반투명 패널 (기록·채팅·아래 막대·이름표) */
  panel: string;
  panelBorder: string;
  /** 고른 칩·칸. 라이트는 잉크 도장, 다크는 갈색 바탕에 금 테두리 */
  selected: string;
  selectedBorder: string;
  onSelected: string;
  /** 시작·차례 마치기 같은 주 행동의 빨간 도장 */
  accent: string;
  accentShadow: string;
  onAccent: string;
  /** 팝업 뒤를 덮는 막 */
  scrim: string;
  /** 제목 글자 */
  heading: string;
  /** 괘선, 옅은 테두리 */
  rule: string;
  /** 고르지 않은 칩 */
  chip: string;
  chipBorder: string;
  hover: string;
  /** 입력칸 바탕 */
  field: string;
  /** 그림자 색 */
  shadow: string;
  /** 첫 화면 수채 그림 위에 덮는 색 */
  veil: string;
  /** 기록 문장 속 파랑 카드 이름 */
  blueName: string;
};

const dark: ThemeColors = {
  ...Colors,
  panel: 'rgba(28, 19, 11, 0.92)',
  panelBorder: '#5C452C',
  selected: Colors.cardBrown,
  selectedBorder: Colors.highlight,
  onSelected: Colors.paper,
  accent: '#B3261E',
  accentShadow: '#5E140F',
  onAccent: '#FBF6EA',
  scrim: 'rgba(0, 0, 0, 0.6)',
  heading: Colors.text,
  rule: 'rgba(243, 231, 206, 0.22)',
  chip: 'rgba(58, 42, 26, 0.7)',
  chipBorder: 'rgba(243, 231, 206, 0.3)',
  hover: 'rgba(242, 193, 78, 0.14)',
  field: 'rgba(20, 12, 6, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  veil: '#140C06',
  blueName: '#7FB6EC',
};

const light: ThemeColors = {
  ...Colors,
  background: '#F3EAD6',
  surface: '#FBF6EA',
  surfaceRaised: '#EFE3C8',
  text: '#2B1D10',
  textMuted: '#6A5238',
  sheriff: '#A8780A',
  deputy: '#2F6AA8',
  outlaw: '#A8261B',
  renegade: '#6A43B0',
  hp: '#B7791F',
  danger: '#B3261E',
  success: '#2F7A3E',
  activeTurn: '#2F8A3E',
  presenceActive: '#2F8A3E',
  presenceAway: '#B7791F',
  presenceLeft: '#B3261E',
  highlight: '#9A6A1C',
  border: 'rgba(43, 29, 16, 0.3)',
  overlay: 'rgba(43, 29, 16, 0.45)',
  panel: 'rgba(251, 246, 234, 0.94)',
  panelBorder: 'rgba(43, 29, 16, 0.28)',
  selected: '#2B1D10',
  selectedBorder: '#2B1D10',
  onSelected: '#FBF6EA',
  accent: '#A8261B',
  accentShadow: '#5E140F',
  onAccent: '#FBF6EA',
  scrim: 'rgba(43, 29, 16, 0.45)',
  heading: '#2B1D10',
  rule: 'rgba(43, 29, 16, 0.3)',
  chip: 'rgba(251, 246, 234, 0.6)',
  chipBorder: 'rgba(43, 29, 16, 0.55)',
  hover: 'rgba(201, 162, 90, 0.22)',
  field: 'rgba(251, 246, 234, 0.85)',
  shadow: 'rgba(60, 40, 20, 0.22)',
  veil: '#F3EAD6',
  blueName: Colors.cardBlue,
};

export type Scheme = 'light' | 'dark';

export const Palettes: Record<Scheme, ThemeColors> = { light, dark };

export const Fonts = Platform.select({
  ios: { sans: 'system-ui', serif: 'ui-serif', rounded: 'ui-rounded', mono: 'ui-monospace' },
  default: { sans: 'normal', serif: 'serif', rounded: 'normal', mono: 'monospace' },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
})!;

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radius = { sm: 4, md: 8, lg: 14, pill: 999 } as const;

/** 이 폭 미만이면 모바일 레이아웃으로 전환한다. */
export const MobileBreakpoint = 820;

/**
 * 이 높이 미만이어도 모바일 레이아웃을 쓴다.
 *
 * 폰을 가로로 눕히면 폭은 넉넉해지지만 높이가 모자라 원형 배치의 좌석이 겹친다.
 */
export const MinTableHeight = 560;
