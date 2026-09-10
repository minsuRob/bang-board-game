/**
 * 뱅! 서부극 테마.
 *
 * 게임 테이블은 항상 어두운 살롱 톤으로 고정한다. 원본 SC2 아케이드 맵의
 * 레이아웃 캡처(reference/sc2-arcade/images/screenshot_25aad3a471f5.jpg)처럼
 * 낡은 종이/나무 질감 위에 카드가 놓인 느낌을 색으로만 흉내낸다.
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
  highlight: '#F2C14E',
  border: '#5C452C',
  overlay: 'rgba(12, 8, 4, 0.78)',
} as const;

export type ThemeColor = keyof typeof Colors;

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
