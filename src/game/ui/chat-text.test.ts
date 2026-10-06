import { describe, expect, it } from 'vitest';

import { autoDraft, handCard, p, scenario } from '../engine/__tests__/helpers';
import { reduce, viewFor, type Action, type GameState } from '../engine';
import { ko as t } from '../../i18n/messages/ko';
import { chatBlockReason, chatSpeaker } from './chat-text';

// 0 보안관(블랙 잭) · 1 무법자(윌리 더 키드, 목숨 1) · 2 부관(슬랩 더 킬러) · 3 배신자(블랙 잭)
function table(): GameState {
  return scenario({
    players: [
      { role: 'sheriff', name: '앨리스', hand: ['bang'] },
      { role: 'outlaw', name: '밥', character: 'willyTheKid', hp: 1 },
      { role: 'deputy', name: '캐럴', character: 'slabTheKiller' },
      { role: 'renegade', name: '데이브' },
    ],
  });
}

describe('채팅 화자 표시', () => {
  it('보안관은 누구에게나 직업이 보인다', () => {
    expect(chatSpeaker(t, table(), 'p1', 0).label).toBe('블랙 잭(보안관)');
  });

  it('남의 숨은 직업은 ??? 로 쓴다', () => {
    const s = table();
    expect(chatSpeaker(t, s, 'p0', 1)).toEqual({ name: '윌리 더 키드', role: null, label: '윌리 더 키드(???)' });
    expect(chatSpeaker(t, s, 'p0', 2).label).toBe('슬랩 더 킬러(???)');
  });

  it('내 글에는 내 직업이 보인다', () => {
    expect(chatSpeaker(t, table(), 'p1', 1).label).toBe('윌리 더 키드(무법자)');
    expect(chatSpeaker(t, table(), 'p3', 3).label).toBe('블랙 잭(배신자)');
  });

  it('가린 상태를 넘겨도 숨은 직업을 무법자로 오표시하지 않는다', () => {
    // viewFor 는 모르는 직업을 'outlaw' 로 채운다. 표시는 roleRevealed 로 판단해야 한다
    const view = viewFor(table(), 'p0');
    expect(chatSpeaker(t, view, 'p0', 2).label).toBe('슬랩 더 킬러(???)');
  });

  it('탈락하면 예전 글까지 직업이 풀린다 (표시 시점 기준)', () => {
    const s0 = table();
    const before = chatSpeaker(t, s0, 'p2', 1).label;
    const shoot: Action = { type: 'playCard', pid: 'p0', card: handCard(s0, 'p0', 'bang'), target: 'p1' };
    const s = reduce(s0, shoot);
    expect(p(s, 'p1').alive).toBe(false);
    expect(before).toBe('윌리 더 키드(???)');
    expect(chatSpeaker(t, s, 'p2', 1).label).toBe('윌리 더 키드(무법자)');
  });

  it('판이 끝나면 모두 드러난다', () => {
    const s = { ...table(), result: { winners: ['sheriff', 'deputy'], winnerIds: ['p0', 'p2'], reason: 'lawWon' } } as GameState;
    expect(chatSpeaker(t, s, 'p0', 2).label).toBe('슬랩 더 킬러(부관)');
    expect(chatSpeaker(t, s, 'p0', 3).label).toBe('블랙 잭(배신자)');
    // 자리 없이 보던 사람도
    expect(chatSpeaker(t, s, null, 1).label).toBe('윌리 더 키드(무법자)');
  });

  it('자리 없이 보는 사람에게는 보안관과 탈락자만 보인다', () => {
    expect(chatSpeaker(t, table(), null, 0).label).toBe('블랙 잭(보안관)');
    expect(chatSpeaker(t, table(), null, 1).label).toBe('윌리 더 키드(???)');
  });

  it('드래프트 중에는 캐릭터 대신 닉네임을 쓴다 (남의 후보가 새지 않게)', () => {
    const seats = ['앨리스', '밥', '캐럴', '데이브'].map((name, i) => ({ id: `p${i}`, name }));
    const s = reduce(null, { type: 'startGame', seed: 3, config: { playerCount: 4, expansions: [] }, seats });
    expect(s.draft).not.toBeNull();
    const sheriffSeat = s.players.find((x) => x.role === 'sheriff')!.seat;
    const other = s.players.find((x) => x.role !== 'sheriff' && x.seat !== 0)!;
    expect(chatSpeaker(t, s, 'p0', sheriffSeat).label).toBe(`${s.players[sheriffSeat].name}(보안관)`);
    expect(chatSpeaker(t, s, 'p0', other.seat).label).toBe(`${other.name}(???)`);

    const done = autoDraft(s);
    expect(done.draft).toBeNull();
    expect(chatSpeaker(t, done, 'p0', other.seat).name).not.toBe(other.name);
  });

  it('없는 자리는 번호로 쓴다', () => {
    expect(chatSpeaker(t, table(), 'p0', 6).label).toBe('7번 자리(???)');
  });
});

describe('채팅 입력 잠금', () => {
  const s = table();
  const alive = p(s, 'p1');
  const dead = { ...alive, alive: false, roleRevealed: true };
  const ghost = { ...dead, ghost: true };

  it('혼자 하는 판은 잠근다', () => {
    expect(chatBlockReason(t, { mode: 'local', me: alive, deadChat: true })).toMatch(/온라인/);
  });

  it('자리 없이 보는 사람은 잠근다', () => {
    expect(chatBlockReason(t, { mode: 'online', me: null, deadChat: true })).toMatch(/자리/);
  });

  it('살아 있으면 말할 수 있다', () => {
    expect(chatBlockReason(t, { mode: 'online', me: alive, deadChat: false })).toBeNull();
  });

  it('탈락자는 방 설정을 따른다', () => {
    expect(chatBlockReason(t, { mode: 'online', me: dead, deadChat: true })).toBeNull();
    expect(chatBlockReason(t, { mode: 'online', me: dead, deadChat: false })).toMatch(/탈락/);
  });

  it('유령도시로 돌아온 유령은 탈락자로 보지 않는다', () => {
    expect(chatBlockReason(t, { mode: 'online', me: ghost, deadChat: false })).toBeNull();
  });

  it('재갈이 걸려 있으면 아무도 말할 수 없다', () => {
    expect(chatBlockReason(t, { mode: 'online', me: alive, deadChat: true, gagged: true })).toMatch(/재갈/);
  });
});
