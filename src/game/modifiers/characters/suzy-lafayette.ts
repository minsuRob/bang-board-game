/**
 * 수지 라파예트 — 손에 남은 카드가 한 장도 없으면 즉시 카드 한 장을 가져온다.
 *
 * 손패가 비는 '모든' 경로에서 울려야 한다. 카드 사용·버리기·강탈당함·감옥 설치·
 * 결투 응답 직후까지 전부. (원본 맵 v0.203, v0.513 패치노트)
 * 그래서 이 훅은 특정 시점이 아니라 스택 해결 루프의 상시 점검으로 구현한다.
 *
 * 유일한 예외가 결투다. 응수로 뱅!을 내자마자 카드를 뽑으면 결투가 끝나지 않는다.
 * 승부가 갈린 '뒤에' 뽑는다. (원본 맵 v0.141 패치노트, EC-51)
 */
import type { Modifier } from '../../engine/modifier';

export const SUZY_REASON = 'suzyLafayette';

export const suzyLafayette: Modifier = {
  id: 'char:suzyLafayette',
  from: 'character',
  onHandEmpty: ({ state, pid }) => {
    const inDuel = state.stack.some((f) => f.k === 'duel' && (f.a === pid || f.b === pid));
    return inDuel ? [] : [{ k: 'drawCards', pid, count: 1, reason: SUZY_REASON }];
  },
};
