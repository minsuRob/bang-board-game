/**
 * 손가락 아래로 카드를 옮기고 속도에 맞춰 기울인다 (하스스톤식). 프레임마다 씬이 부른다.
 */

import * as THREE from 'three';

import type { PlayerId } from '../../engine';
import { dragStore } from '../core/drag-store';
import { clamp, damp } from '../core/math';
import type { CardWorld } from './CardWorld';

const HOVER_Y = 0.75;

export type DragFrame = {
  camera: THREE.Camera;
  width: number;
  height: number;
  viewerIndex: number;
  playerIds: PlayerId[];
  /** 탭으로 골라 둔 카드. 대상을 기다리는 동안 가운데 위에 띄운다 */
  selected: string | null;
};

export class DragTracker {
  private card: string | null = null;
  private pitch = 0;
  private roll = 0;
  private returnCard: string | null = null;
  private returnUntil = 0;
  private hoverCard: string | null = null;
  private hoverStart = 0;
  private readonly ray = new THREE.Raycaster();
  private readonly ndc = new THREE.Vector2();

  constructor(private readonly world: CardWorld) {}

  /** 움직이는 중이면 true */
  tick(step: number, now: number, f: DragFrame): boolean {
    const world = this.world;
    // 첫 배치 전에는 자리를 계산할 수 없다
    if (!world.layout) return false;
    const d = dragStore.getState();

    if (d.active) {
      const a = d.active;
      const h = world.handle(a.card);
      if (this.card !== a.card) {
        this.card = a.card;
        this.pitch = 0;
        this.roll = 0;
        h.driven = true;
        h.snap(world.handPose(f.viewerIndex, 0, 1));
      }
      this.ndc.set((a.x / f.width) * 2 - 1, -(a.y / f.height) * 2 + 1);
      this.ray.setFromCamera(this.ndc, f.camera);
      const o = this.ray.ray.origin;
      const dir = this.ray.ray.direction;
      const t = dir.y !== 0 ? (HOVER_Y - o.y) / dir.y : 0;
      const px = o.x + dir.x * t;
      const pz = o.z + dir.z * t;
      // 움직이는 방향으로 기울고, 멈추면 천천히 평평해진다
      this.pitch = damp(this.pitch, clamp(-a.vy * 0.0007, -0.5, 0.5), 10, step);
      this.roll = damp(this.roll, clamp(-a.vx * 0.0007, -0.5, 0.5), 10, step);
      h.set({ pos: [px, HOVER_Y, pz], yaw: 0, pitch: this.pitch, roll: this.roll, flip: 0, spin: 0, scale: 1.3 });

      // 손가락 아래 좌석
      let hover: PlayerId | null = null;
      let best = 1.45;
      for (const s of world.layout?.seats ?? []) {
        if (s.index === f.viewerIndex) continue;
        const dist = Math.hypot(s.pos[0] - px, s.pos[2] - pz);
        if (dist < best) {
          best = dist;
          hover = f.playerIds[s.index] ?? null;
        }
      }
      if (hover !== d.hover) dragStore.setState({ hover });
      if (hover) world.table.flash(world.seatIndexOf(hover), 'gold', 80, now);
      return true;
    }

    if (this.card) {
      // 방금 놓았다
      const card = this.card;
      this.card = null;
      const h = world.handle(card);
      h.driven = false;
      if (d.returning === card) {
        this.sendBack(card, f.viewerIndex, now);
      } else {
        // 냈다. 전이가 오면 연출이 여기서부터 이어받는다
        h.setTarget({ ...h.current });
      }
      return true;
    }

    // 탭으로 고른 카드: 가운데 위에 떠서 천천히 흔들린다
    if (f.selected) {
      const h = world.handle(f.selected);
      if (this.hoverCard !== f.selected) {
        if (this.hoverCard) this.sendBack(this.hoverCard, f.viewerIndex, now);
        this.hoverCard = f.selected;
        h.driven = true;
        h.snap(world.handPose(f.viewerIndex, 0, 1));
        this.hoverStart = now;
      }
      const c = world.centerPose(1.0);
      const k = 1 - Math.exp(-6 * step);
      const bob = Math.sin((now - this.hoverStart) / 420) * 0.06;
      const cur = h.current;
      h.set({
        pos: [
          cur.pos[0] + (c.pos[0] - cur.pos[0]) * k,
          cur.pos[1] + (c.pos[1] + bob - cur.pos[1]) * k,
          cur.pos[2] + (c.pos[2] - cur.pos[2]) * k,
        ],
        yaw: 0,
        pitch: cur.pitch + (-0.55 + Math.sin((now - this.hoverStart) / 900) * 0.08 - cur.pitch) * k,
        roll: Math.sin((now - this.hoverStart) / 700) * 0.05,
        flip: 0,
        spin: 0,
        scale: cur.scale + (1.35 - cur.scale) * k,
      });
      return true;
    }
    if (this.hoverCard) {
      const card = this.hoverCard;
      this.hoverCard = null;
      const h = world.handle(card);
      h.driven = false;
      // 냈다면 전이가 곧 이어받는다. 취소했다면 손으로 돌아간다
      if (world.isReservedNow(card)) h.setTarget({ ...h.current });
      else this.sendBack(card, f.viewerIndex, now);
      return true;
    }

    if (this.returnCard && now > this.returnUntil) {
      const h = world.handle(this.returnCard);
      // 그새 연출이 잡아갔으면 손대지 않는다
      if (!h.driven) world.release(this.returnCard);
      this.returnCard = null;
      dragStore.setState({ returning: null });
      return true;
    }
    return this.returnCard !== null;
  }

  private sendBack(card: string, viewerIndex: number, now: number) {
    const h = this.world.handle(card);
    h.driven = false;
    h.setTarget(this.world.handPose(viewerIndex, 0, 1));
    this.returnCard = card;
    this.returnUntil = now + 450;
  }
}
