/**
 * 엔진 공개 API.
 *
 * UI 와 AI 는 여기까지만 안다. 내부 프레임 해결기는 노출하지 않는다.
 */

export { reduce, defaultAction } from './reducer';
export { createGame, draftOfferCount } from './setup';
export { legalActions, actionKey, hasReaction, actorsOf, isRepeatableBrown } from './legal';
export { checkWin } from './frames/win';
export {
  distance,
  baseDistance,
  canReachWithBang,
  canReachAtRange,
  weaponRangeOf,
  seatRing,
} from './distance';
export {
  alivePlayers,
  seatedPlayers,
  playerOf,
  inPlay,
  cardOf,
  defOf,
  kindOf,
  effectiveSuit,
  weaponOf,
} from './cards';
export {
  bangLimitOf,
  getModifiers,
  anytimeAbilitiesOf,
  isExplicitAbility,
  playAnyAsAbilitiesOf,
  repeatAbilitiesOf,
  swapAbilitiesOf,
  playableAs,
} from './hooks';
export { viewFor, isHidden, roleVisibleTo, HIDDEN_CARD } from './view';
export { createRng } from './rng';
export type { RngState } from './rng';
export type {
  Action,
  Choice,
  DraftState,
  Frame,
  GameConfig,
  GameEvent,
  GameResult,
  GameState,
  JudgementPurpose,
  PendingInput,
  Phase,
  Player,
  PlayerId,
  StealPick,
  TurnState,
} from './types';
export type { Seat } from './setup';
export type { PlayAsAbility } from './modifier';
