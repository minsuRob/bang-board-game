import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * 웹 정적 출력의 HTML 뼈대.
 *
 * 자바스크립트가 뜨기 전에 고른 테마(bang.ui.theme)나 기기 설정을 읽어 바탕색부터 칠한다.
 * 그러지 않으면 다크 테마에서 첫 순간 밝은 종이색이 번쩍인다. 색은 Palettes.*.background 와 같다.
 */
const THEME_BOOT = `(function(){try{var p=localStorage.getItem('bang.ui.theme');var d=p==='dark'||(p!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.style.background=d?'#1B120B':'#F3EAD6';document.documentElement.style.colorScheme=d?'dark':'light';}catch(e){}})();`;

/**
 * 화면 언어도 같은 식으로 먼저 정한다. 고른 값(bang.ui.lang)이 있으면 그것을, 없으면 브라우저 언어를 쓴다.
 * ko·it 가 아니면 en. 언어가 바뀌면 앱이 lang 속성을 다시 맞춘다 (use-t.ts 의 useDocumentLang).
 */
const LANG_BOOT = `(function(){try{var p=localStorage.getItem('bang.ui.lang');var n=((navigator.languages&&navigator.languages[0])||navigator.language||'').slice(0,2).toLowerCase();var l=p==='ko'||p==='en'||p==='it'?p:(n==='ko'||n==='it'?n:'en');document.documentElement.lang=l;}catch(e){}})();`;

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        {/* iPhone 은 전체 화면 API 가 없다. 홈 화면에 추가해서 열면 주소창 없이 뜨게 한다 (FullscreenButton) */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black" />
        <meta name="apple-mobile-web-app-title" content="BANG!" />
        <ScrollViewStyleReset />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT + LANG_BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
