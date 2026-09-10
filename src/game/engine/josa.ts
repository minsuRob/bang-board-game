/**
 * 한국어 조사 선택.
 *
 * 로그가 "현상금꾼이(가)" 처럼 보이면 읽는 흐름이 끊긴다.
 * 앞말의 받침을 보고 조사를 골라 붙인다.
 */

/** 숫자를 한국어로 읽었을 때 받침이 있는가 (영·일·삼·육·칠·팔) */
const DIGIT_HAS_FINAL: Record<string, boolean> = {
  '0': true,
  '1': true,
  '2': false,
  '3': true,
  '4': false,
  '5': false,
  '6': true,
  '7': true,
  '8': true,
  '9': false,
};

/** 알파벳을 한국어로 읽었을 때 받침이 있는가 (엘·엠·엔 등) */
const LETTER_HAS_FINAL: Record<string, boolean> = {
  l: true,
  m: true,
  n: true,
  r: true,
};

export function hasFinalConsonant(word: string): boolean {
  const last = word.trim().slice(-1);
  if (!last) return false;

  const code = last.charCodeAt(0);
  // 한글 음절 영역
  if (code >= 0xac00 && code <= 0xd7a3) return (code - 0xac00) % 28 !== 0;
  if (last >= '0' && last <= '9') return DIGIT_HAS_FINAL[last];

  const lower = last.toLowerCase();
  if (lower >= 'a' && lower <= 'z') return LETTER_HAS_FINAL[lower] ?? false;

  // 알 수 없는 글자는 받침이 있다고 본다 (그편이 덜 어색하다)
  return true;
}

function attach(word: string, withFinal: string, withoutFinal: string): string {
  return word + (hasFinalConsonant(word) ? withFinal : withoutFinal);
}

/**
 * 이 / 가.
 *
 * 1인칭 대명사는 조사가 붙으면서 말 자체가 바뀐다 (나 + 가 → 내가).
 * 게임 로그에서 사람 이름 자리에 '나'가 그대로 들어가므로 여기서 처리한다.
 */
const SUBJECT_IRREGULAR: Record<string, string> = {
  나: '내가',
  저: '제가',
  너: '네가',
};

export function ga(word: string): string {
  const irregular = SUBJECT_IRREGULAR[word.trim()];
  if (irregular) return irregular;
  return attach(word, '이', '가');
}

/** 을 / 를 */
export function eul(word: string): string {
  return attach(word, '을', '를');
}

/** 은 / 는 */
export function neun(word: string): string {
  return attach(word, '은', '는');
}

/** 과 / 와 */
export function wa(word: string): string {
  return attach(word, '과', '와');
}

/** 으로 / 로 */
export function ro(word: string): string {
  const last = word.trim().slice(-1);
  const code = last.charCodeAt(0);
  // ㄹ 받침은 '로' 를 쓴다
  if (code >= 0xac00 && code <= 0xd7a3 && (code - 0xac00) % 28 === 8) return `${word}로`;
  return attach(word, '으로', '로');
}
