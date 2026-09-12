/**
 * 트랙 몇 개를 시간으로 굴리는 아주 작은 스케줄러. three 를 모른다.
 */

export type Ease = (t: number) => number;

export type Track = {
  /** 절대 시각 (ms) */
  start: number;
  dur: number;
  ease?: Ease;
  update: (p: number) => void;
  done?: () => void;
};

export class Timeline {
  private tracks: Track[] = [];

  add(track: Track) {
    this.tracks.push(track);
  }

  get size(): number {
    return this.tracks.length;
  }

  /** 트랙이 남아 있으면 true */
  tick(now: number): boolean {
    if (this.tracks.length === 0) return false;
    const keep: Track[] = [];
    // update 안에서 add 가 일어날 수 있으니 복사본을 돈다
    const running = this.tracks;
    this.tracks = [];
    for (const t of running) {
      if (now < t.start) {
        keep.push(t);
        continue;
      }
      const raw = t.dur <= 0 ? 1 : Math.min(1, (now - t.start) / t.dur);
      t.update(t.ease ? t.ease(raw) : raw);
      if (raw >= 1) t.done?.();
      else keep.push(t);
    }
    this.tracks = keep.concat(this.tracks);
    return this.tracks.length > 0;
  }

  /** 남은 트랙을 끝 상태로 보내고 비운다 */
  flush() {
    const running = this.tracks;
    this.tracks = [];
    for (const t of running) {
      t.update(1);
      t.done?.();
    }
  }
}
