/**
 * 저장소 인터페이스와 기기 저장소.
 *
 * 게임 화면은 SaveBackend 만 안다. 지금은 기기 저장소(웹은 localStorage, 앱은 AsyncStorage)를 쓰고,
 * 나중에 Firestore(firestore-backend.ts)로 바꿔 끼워도 화면은 그대로다.
 *
 * 기기 저장소는 키 둘로 나눠 적는다.
 *   bang.saves        목록 (SaveMeta[] JSON). 설정 화면이 이것만 읽어 목록을 그린다
 *   bang.save.{id}    본문 (수백 KB 가 될 수 있다). 이어 볼 때만 읽는다
 * 본문을 먼저 쓰고 목록을 나중에 쓴다. 중간에 끊겨도 목록이 없는 본문을 가리키지 않는다.
 *
 * 이 파일은 AsyncStorage 를 직접 import 하지 않는다 (index.ts 가 끼운다). 테스트는 메모리 저장소로 돈다.
 */

import { isSaveMeta, MAX_SAVES, SaveError, sortSaves, type SaveMeta, type SaveRecord } from './save-model';

export type SaveBackendKind = 'device' | 'cloud';

export interface SaveBackend {
  readonly kind: SaveBackendKind;
  /** 최근에 저장한 것부터 */
  list(): Promise<SaveMeta[]>;
  load(id: string): Promise<SaveRecord | null>;
  /** 같은 id 가 있으면 덮어쓴다. 칸이 가득 찼으면 SaveError */
  put(record: SaveRecord): Promise<void>;
  remove(id: string): Promise<void>;
}

/** AsyncStorage 와 같은 모양. 웹에서는 AsyncStorage 가 localStorage 로 떨어진다 */
export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const INDEX_KEY = 'bang.saves';
const bodyKey = (id: string) => `bang.save.${id}`;

export function fullSlotsMessage(limit: number): string {
  return `저장 칸이 가득 찼다 (${limit}칸). 판 설정 화면에서 저장한 판을 지우고 다시 저장해라.`;
}

export function createDeviceSaveBackend(kv: KeyValueStore, limit = MAX_SAVES): SaveBackend {
  async function readIndex(): Promise<SaveMeta[]> {
    const raw = await kv.getItem(INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter(isSaveMeta) : [];
    } catch {
      return [];
    }
  }

  async function writeIndex(list: SaveMeta[]): Promise<void> {
    await kv.setItem(INDEX_KEY, JSON.stringify(sortSaves(list)));
  }

  return {
    kind: 'device',

    async list() {
      return sortSaves(await readIndex());
    },

    async load(id) {
      const meta = (await readIndex()).find((m) => m.id === id);
      if (!meta) return null;
      const body = await kv.getItem(bodyKey(id));
      return body ? { meta, body } : null;
    },

    async put(record) {
      const index = await readIndex();
      const exists = index.some((m) => m.id === record.meta.id);
      if (!exists && index.length >= limit) throw new SaveError(fullSlotsMessage(limit));

      try {
        await kv.setItem(bodyKey(record.meta.id), record.body);
      } catch {
        // 웹 localStorage 가 가득 차면 QuotaExceededError 가 난다
        throw new SaveError('기기 저장 공간이 모자라 저장하지 못했다.');
      }
      try {
        await writeIndex([...index.filter((m) => m.id !== record.meta.id), record.meta]);
      } catch {
        // 새 칸이었다면 목록에 없는 본문이 남지 않게 치운다. 덮어쓰던 칸은 예전 목록이 그대로다
        if (!exists) await kv.removeItem(bodyKey(record.meta.id)).catch(() => {});
        throw new SaveError('기기 저장 공간이 모자라 저장하지 못했다.');
      }
    },

    async remove(id) {
      const index = await readIndex();
      await writeIndex(index.filter((m) => m.id !== id));
      await kv.removeItem(bodyKey(id));
    },
  };
}
