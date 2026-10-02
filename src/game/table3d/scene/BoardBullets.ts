/**
 * 보드 위 목숨 총알. 최대 목숨만큼 총알 칸에 총알을 눕힌다.
 *
 * 잃은 목숨은 총알을 긴 축으로 뒤집어 어두운 뒷면이 보이게 두고, 회복하면 다시 뒤집는다.
 * 앞면과 뒷면은 같은 행렬의 두 인스턴스 메시라 각도에 따라 한쪽만 보인다.
 * 최대 목숨을 넘는 칸은 어둡게 덮는다.
 */

import * as THREE from 'three';

import type { GameState } from '../../engine';
import { BOARD_SLOTS } from '../core/layout';
import { BOARD_SIZE, type TableLayout, type Vec3 } from '../core/types';
import { bulletBackMaterial, bulletMaterial } from '../materials/card-materials';

const PER_SEAT = BOARD_SLOTS.bullets.length;
const MAX = 8 * PER_SEAT;

/** 총알 한 발 크기 (보드 폭 기준 비율) */
const LEN = 0.155;
/** 그림의 윤곽처럼 오른쪽 아래로 기울인다 */
const TILT = -0.61;
/** 한 발 뒤집는 데 걸리는 시간 (초) */
const FLIP_TIME = 0.4;
/** 여러 발을 한꺼번에 뒤집을 때 사이 간격 (초) */
const STAGGER = 0.12;

/** 칸 하나. t 0 = 앞면, 1 = 뒷면 */
type Slot = { at: Vec3; yaw: number; len: number; t: number; target: number; delay: number };

const ease = (t: number) => t * t * (3 - 2 * t);
const X_AXIS = new THREE.Vector3(1, 0, 0);

export class BoardBullets {
  readonly root = new THREE.Group();
  private readonly fronts: THREE.InstancedMesh;
  private readonly backs: THREE.InstancedMesh;
  private readonly blanks: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly turn = new THREE.Quaternion();
  /** 키: `${playerId}:${칸}` */
  private readonly slots = new Map<string, Slot>();
  /** 이번 판에서 그리는 칸 (update 순서) */
  private shown: Slot[] = [];

  constructor() {
    const geo = new THREE.PlaneGeometry(1, 1);
    this.fronts = new THREE.InstancedMesh(geo, bulletMaterial(), MAX);
    this.backs = new THREE.InstancedMesh(geo, bulletBackMaterial(), MAX);
    this.blanks = new THREE.InstancedMesh(
      new THREE.CircleGeometry(0.5, 20),
      new THREE.MeshBasicMaterial({ color: '#1A120A', transparent: true, opacity: 0.6, depthWrite: false }),
      MAX,
    );
    for (const m of [this.fronts, this.backs, this.blanks]) {
      m.count = 0;
      m.frustumCulled = false;
      this.root.add(m);
    }
    this.dummy.rotation.order = 'YXZ';
  }

  update(layout: TableLayout, state: GameState, snap: boolean) {
    let nx = 0;
    const d = this.dummy;
    const shown: Slot[] = [];
    state.players.forEach((p, i) => {
      const seat = layout.seats[i];
      if (!seat || state.draft || (!p.alive && !p.ghost)) return;
      const hp = Math.max(0, p.hp);
      const len = LEN * BOARD_SIZE.w * seat.scale;
      // 잃을 때는 높은 칸부터, 회복할 때는 낮은 칸부터 차례로 뒤집는다
      let losing = 0;
      const gaining: Slot[] = [];
      for (let j = Math.min(p.maxHp, seat.bullets.length) - 1; j >= 0; j--) {
        const key = `${p.id}:${j}`;
        const target = j < hp ? 0 : 1;
        let s = this.slots.get(key);
        if (!s) {
          s = { at: seat.bullets[j], yaw: seat.yaw, len, t: target, target, delay: 0 };
          this.slots.set(key, s);
        }
        s.at = seat.bullets[j];
        s.yaw = seat.yaw;
        s.len = len;
        if (snap) {
          s.t = target;
          s.delay = 0;
        } else if (s.target !== target) {
          if (target === 1) s.delay = STAGGER * losing++;
          else gaining.unshift(s);
        }
        s.target = target;
        shown.push(s);
      }
      gaining.forEach((s, k) => (s.delay = STAGGER * k));
      seat.bullets.forEach((at, j) => {
        if (j < p.maxHp) return;
        d.position.set(at[0], 0.011, at[2]);
        d.rotation.set(-Math.PI / 2, seat.yaw, 0);
        d.scale.set(len * 0.9, len * 0.9, 1);
        d.updateMatrix();
        this.blanks.setMatrixAt(nx++, d.matrix);
      });
    });
    this.shown = shown;
    this.blanks.count = nx;
    this.blanks.instanceMatrix.needsUpdate = true;
    this.writeBullets();
  }

  /** 뒤집는 중인 총알을 dt 초만큼 움직인다. 움직였으면 true */
  tick(dt: number): boolean {
    let moving = false;
    for (const s of this.shown) {
      if (s.t === s.target) continue;
      moving = true;
      if (s.delay > 0) {
        s.delay = Math.max(0, s.delay - dt);
        continue;
      }
      const step = dt / FLIP_TIME;
      s.t = s.target > s.t ? Math.min(s.target, s.t + step) : Math.max(s.target, s.t - step);
    }
    if (moving) this.writeBullets();
    return moving;
  }

  private writeBullets() {
    const d = this.dummy;
    let n = 0;
    for (const s of this.shown) {
      const e = ease(s.t);
      // 뒤집는 동안 보드에 파묻히지 않게 살짝 띄운다
      d.position.set(s.at[0], 0.012 + Math.sin(Math.PI * e) * s.len * 0.35, s.at[2]);
      d.rotation.set(-Math.PI / 2, s.yaw, TILT);
      // 로컬 X 축 = 총알의 긴 축
      d.quaternion.multiply(this.turn.setFromAxisAngle(X_AXIS, Math.PI * e));
      d.scale.set(s.len, s.len / 3, 1);
      d.updateMatrix();
      this.fronts.setMatrixAt(n, d.matrix);
      this.backs.setMatrixAt(n, d.matrix);
      n++;
    }
    this.fronts.count = n;
    this.backs.count = n;
    this.fronts.instanceMatrix.needsUpdate = true;
    this.backs.instanceMatrix.needsUpdate = true;
  }
}
