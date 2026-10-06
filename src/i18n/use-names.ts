import { useMemo } from 'react';

import { namesFor, type Names } from './names';
import { getLang, useLang } from './use-t';

/** 컴포넌트에서 쓰는 이름 조회: `const { cardName, charName } = useNames()` */
export function useNames(): Names {
  const lang = useLang();
  return useMemo(() => namesFor(lang), [lang]);
}

/** React 밖(스토어·오류 처리)에서 쓰는 판 */
export function getNames(): Names {
  return namesFor(getLang());
}
