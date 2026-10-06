import type { ko } from './messages/ko';

/** 화면 문구 사전의 모양. ko 가 원본이라 en·it 에 키가 빠지면 타입 검사가 실패한다 */
export type Messages = typeof ko;
