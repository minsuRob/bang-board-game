/**
 * 첫 화면에 쓰는 서부극 글꼴.
 *
 * 웹에서만 Google Fonts 에서 받는다. 앱(iOS·Android)에는 글꼴 파일을 아직 넣지 않았으니
 * fontFamily 를 비워 시스템 글꼴의 굵은 체로 그린다.
 */

import { Platform } from 'react-native';

const HREF =
  'https://fonts.googleapis.com/css2?family=Rye&family=Black+Han+Sans&family=Gowun+Batang:wght@400;700&family=Special+Elite&display=swap';

let injected = false;

/** 웹 문서에 글꼴 스타일시트를 한 번만 붙인다 */
export function loadWesternFonts() {
  if (injected || Platform.OS !== 'web' || typeof document === 'undefined') return;
  injected = true;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = HREF;
  document.head.appendChild(link);
}

const web = Platform.OS === 'web';

export const WesternFonts = {
  /** BANG! 제목 */
  title: web ? 'Rye, Georgia, serif' : undefined,
  /** 카드 이름처럼 굵게 박는 한글 */
  label: web ? '"Black Han Sans", sans-serif' : undefined,
  /** 설명 문구 */
  body: web ? '"Gowun Batang", serif' : undefined,
  /** 카드 귀퉁이 숫자, 방 코드 */
  type: web ? '"Special Elite", monospace' : undefined,
};
