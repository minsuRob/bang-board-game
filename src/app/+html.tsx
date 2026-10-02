import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * 웹 정적 출력의 HTML 뼈대.
 *
 * 자바스크립트가 뜨기 전에 고른 테마(bang.ui.theme)나 기기 설정을 읽어 바탕색부터 칠한다.
 * 그러지 않으면 다크 테마에서 첫 순간 밝은 종이색이 번쩍인다. 색은 Palettes.*.background 와 같다.
 */
const THEME_BOOT = `(function(){try{var p=localStorage.getItem('bang.ui.theme');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.style.background=d?'#1B120B':'#F3EAD6';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="ko">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
