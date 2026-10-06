/**
 * 저장 모듈이 쓰는 문구. 순수 모듈(save-model·save-backend)은 React·expo 를 import 하지 못하므로
 * 현재 언어를 직접 읽지 않는다. 앱은 save/index.ts 에서 setSaveLocale 로 현재 언어를 읽는 함수를 끼운다.
 * 끼우지 않으면(테스트) 한국어다.
 */

import { ko } from '../../i18n/messages/ko';
import type { Messages } from '../../i18n/types-messages';
import type { Lang } from '../../i18n/types';

export type SaveLocale = { lang: Lang; t: Messages };

let provider: () => SaveLocale = () => ({ lang: 'ko', t: ko });

export function setSaveLocale(fn: () => SaveLocale): void {
  provider = fn;
}

export function saveLocale(): SaveLocale {
  return provider();
}
