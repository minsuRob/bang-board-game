/**
 * 기기에 남기는 값 (닉네임, 마지막 방).
 *
 * AsyncStorage 는 웹에서도 동작한다 (localStorage 로 떨어진다).
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const NICKNAME_KEY = 'bang.nickname';
const LAST_ROOM_KEY = 'bang.lastRoom';

export async function loadNickname(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(NICKNAME_KEY);
  } catch {
    return null;
  }
}

export async function saveNickname(nickname: string): Promise<void> {
  try {
    await AsyncStorage.setItem(NICKNAME_KEY, nickname);
  } catch {
    // 저장 실패는 게임 진행을 막지 않는다.
  }
}

export async function loadLastRoom(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(LAST_ROOM_KEY);
  } catch {
    return null;
  }
}

export async function saveLastRoom(code: string | null): Promise<void> {
  try {
    if (code) await AsyncStorage.setItem(LAST_ROOM_KEY, code);
    else await AsyncStorage.removeItem(LAST_ROOM_KEY);
  } catch {
    // 무시
  }
}
