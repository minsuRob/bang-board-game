/**
 * 카드 도감의 규칙 메모. 헷갈리기 쉬운 판정을 플레이어가 읽을 말로 짧게 적는다.
 *
 * 근거는 docs/edge-cases.md (EC 번호와 「애매해서 결정이 필요한 항목」). 그 문서는 개발자용이라
 * 패치노트·테스트 이야기를 빼고 이 게임이 실제로 어떻게 판정하는지만 옮겼다.
 * 규칙을 바꾸면 여기 문장도 같이 고친다. 메모가 없는 항목은 도감에서 칸을 감춘다.
 */

import type { Messages } from '../../../i18n/types-messages';
import type { CodexTab } from './codex-model';

/** 메모 글은 사전(t.codex.notes)에 있다. 여기서는 탭과 id 로 찾기만 한다 */
export function ruleNotes(tab: CodexTab, id: string, t: Messages): readonly string[] {
  return (t.codex.notes[tab] as Record<string, readonly string[]>)[id] ?? [];
}

/** 메모가 붙은 id (오타로 아무 데도 안 붙는 메모를 테스트가 잡는다) */
export function ruleNoteIds(tab: CodexTab, t: Messages): string[] {
  return Object.keys(t.codex.notes[tab]);
}
