/**
 * 펠트·림·좌석 매트·더미 받침. 조명 없이 색만.
 */

import * as THREE from 'three';

import { Colors } from '@/constants/theme';
import { CARD_SIZE, MAT_SIZE, type TableLayout } from '../core/types';
import { feltNoiseTexture } from '../materials/textures';

function roundedRect(w: number, h: number, r: number): THREE.ShapeGeometry {
  const s = new THREE.Shape();
  const x = -w / 2;
  const y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r);
  s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h);
  s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  return new THREE.ShapeGeometry(s, 6);
}

export type MatTone = 'idle' | 'active' | 'target' | 'dead';

const MAT_COLOR: Record<MatTone, string> = {
  idle: '#4E3A24',
  active: '#6E4E22',
  target: '#8A6A22',
  dead: '#2A1E14',
};

const MAT_RIM = '#241810';

const FLASH_COLOR = { red: '#B33A2A', green: '#3F8A4A', gold: '#B08A2E' } as const;

export class TableGeometry {
  readonly root = new THREE.Group();
  private readonly felt: THREE.Mesh;
  private readonly rim: THREE.Mesh;
  private readonly matGeometry = roundedRect(MAT_SIZE.w, MAT_SIZE.h, 0.18);
  private readonly slotGeometry = roundedRect(CARD_SIZE.w + 0.18, CARD_SIZE.h + 0.18, 0.08);
  private readonly matRimGeometry = roundedRect(MAT_SIZE.w + 0.1, MAT_SIZE.h + 0.1, 0.22);
  private mats: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[] = [];
  private matRims: THREE.Mesh[] = [];
  private slots: THREE.Mesh[] = [];
  /** 매트별 강조색. 색을 damp 로 붙일 때 쓴다 */
  private matTargets: THREE.Color[] = [];
  private flashes: ({ until: number; color: THREE.Color } | null)[] = [];

  constructor() {
    const disc = new THREE.CircleGeometry(1, 72);
    this.rim = new THREE.Mesh(disc, new THREE.MeshBasicMaterial({ color: Colors.border }));
    this.rim.rotation.x = -Math.PI / 2;
    this.rim.position.y = -0.02;
    this.felt = new THREE.Mesh(
      disc,
      new THREE.MeshBasicMaterial({ color: '#3B2A19', map: feltNoiseTexture() }),
    );
    this.felt.rotation.x = -Math.PI / 2;
    this.felt.position.y = -0.01;
    this.root.add(this.rim, this.felt);
  }

  setLayout(layout: TableLayout) {
    const fx = layout.rx + 1.7;
    const fz = layout.ry + 1.45;
    this.felt.scale.set(fx, fz, 1);
    this.rim.scale.set(fx + 0.14, fz + 0.14, 1);

    while (this.mats.length < layout.n) {
      const m = new THREE.Mesh(
        this.matGeometry,
        new THREE.MeshBasicMaterial({ color: MAT_COLOR.idle, transparent: true, opacity: 0.85 }),
      );
      const rim = new THREE.Mesh(
        this.matRimGeometry,
        new THREE.MeshBasicMaterial({ color: MAT_RIM, transparent: true, opacity: 0.9 }),
      );
      for (const o of [m, rim]) o.rotation.order = 'YXZ';
      this.root.add(rim, m);
      this.mats.push(m);
      this.matRims.push(rim);
      this.matTargets.push(new THREE.Color(MAT_COLOR.idle));
      this.flashes.push(null);
    }
    this.mats.forEach((m, i) => {
      const seat = layout.seats[i];
      const rim = this.matRims[i];
      m.visible = rim.visible = Boolean(seat);
      if (!seat) return;
      // ShapeGeometry 는 xy 평면. x 로 눕힌 뒤(YXZ 순서라 나중에 적용) y 로 돌려 긴 변이 중심을 보게 한다
      m.position.set(seat.pos[0], 0.006, seat.pos[2]);
      m.rotation.set(-Math.PI / 2, seat.yaw, 0);
      rim.position.set(seat.pos[0], 0.004, seat.pos[2]);
      rim.rotation.set(-Math.PI / 2, seat.yaw, 0);
    });

    while (this.slots.length < 2) {
      const s = new THREE.Mesh(
        this.slotGeometry,
        new THREE.MeshBasicMaterial({ color: '#2A1D11', transparent: true, opacity: 0.7 }),
      );
      s.rotation.x = -Math.PI / 2;
      this.root.add(s);
      this.slots.push(s);
    }
    this.slots[0].position.set(layout.deck[0], 0.003, layout.deck[2]);
    this.slots[1].position.set(layout.discard[0], 0.003, layout.discard[2]);
  }

  setMatTone(index: number, tone: MatTone) {
    const t = this.matTargets[index];
    if (t) t.set(MAT_COLOR[tone]);
  }

  /** 매트를 잠깐 물들인다 */
  flash(index: number, tone: 'red' | 'green' | 'gold', ms: number, now: number) {
    if (index < 0 || index >= this.mats.length) return;
    this.flashes[index] = { until: now + ms, color: new THREE.Color(FLASH_COLOR[tone]) };
  }

  /** 색을 부드럽게 붙인다. 아직 움직이는 중이면 true */
  tick(dt: number, now: number): boolean {
    let moving = false;
    const k = 1 - Math.exp(-8 * dt);
    this.mats.forEach((m, i) => {
      const c = m.material.color;
      const f = this.flashes[i];
      if (f && now >= f.until) this.flashes[i] = null;
      const t = f && now < f.until ? f.color : this.matTargets[i];
      if (Math.abs(c.r - t.r) + Math.abs(c.g - t.g) + Math.abs(c.b - t.b) < 0.004) return;
      c.lerp(t, k);
      moving = true;
    });
    return moving;
  }
}
