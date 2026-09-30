/**
 * 펠트·림·좌석 보드·더미 받침. 조명 없이 색만.
 *
 * 좌석마다 플레이어 보드 그림을 깐다. 차례·지목·피격 색은 보드 밑 테두리가 받는다.
 * 그림에 색을 곱하면 탁해지기 때문이다. 탈락자는 보드 위에 어두운 막을 덮는다.
 */

import * as THREE from 'three';

import { Colors } from '@/constants/theme';
import { BOARD_SIZE, CARD_SIZE, type TableLayout } from '../core/types';
import { boardMaterial } from '../materials/card-materials';
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

/** 보드 테두리 색 */
const RIM_COLOR: Record<MatTone, string> = {
  idle: '#241810',
  active: Colors.activeTurn,
  target: Colors.highlight,
  dead: '#140E08',
};

const FLASH_COLOR = { red: '#D9442F', green: '#4FB35E', gold: '#E2B23A' } as const;

/** 테두리 두께 */
const RIM = 0.07;

export class TableGeometry {
  readonly root = new THREE.Group();
  private readonly felt: THREE.Mesh;
  private readonly rim: THREE.Mesh;
  private readonly boardGeometry = new THREE.PlaneGeometry(BOARD_SIZE.w, BOARD_SIZE.h);
  private readonly slotGeometry = roundedRect(CARD_SIZE.w + 0.18, CARD_SIZE.h + 0.18, 0.08);
  private readonly boardRimGeometry = roundedRect(BOARD_SIZE.w + RIM * 2, BOARD_SIZE.h + RIM * 2, 0.1);
  private readonly shadeMaterial = new THREE.MeshBasicMaterial({
    color: '#000000',
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  });
  private boards: THREE.Mesh[] = [];
  private shades: THREE.Mesh[] = [];
  private rims: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>[] = [];
  private slots: THREE.Mesh[] = [];
  /** 좌석별 테두리 목표색. 색을 damp 로 붙일 때 쓴다 */
  private rimTargets: THREE.Color[] = [];
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
    // 보드 바깥으로 삐져나오는 손패 부채까지 펠트가 덮도록
    const fx = layout.rx + 2.0;
    const fz = layout.ry + 1.8;
    this.felt.scale.set(fx, fz, 1);
    this.rim.scale.set(fx + 0.14, fz + 0.14, 1);

    while (this.boards.length < layout.n) {
      const board = new THREE.Mesh(this.boardGeometry, boardMaterial());
      const shade = new THREE.Mesh(this.boardGeometry, this.shadeMaterial);
      const rim = new THREE.Mesh(
        this.boardRimGeometry,
        new THREE.MeshBasicMaterial({ color: RIM_COLOR.idle, transparent: true, opacity: 0.95 }),
      );
      for (const o of [board, shade, rim]) o.rotation.order = 'YXZ';
      shade.visible = false;
      this.root.add(rim, board, shade);
      this.boards.push(board);
      this.shades.push(shade);
      this.rims.push(rim);
      this.rimTargets.push(new THREE.Color(RIM_COLOR.idle));
      this.flashes.push(null);
    }
    this.boards.forEach((board, i) => {
      const seat = layout.seats[i];
      const rim = this.rims[i];
      const shade = this.shades[i];
      board.visible = rim.visible = Boolean(seat);
      if (!seat) {
        shade.visible = false;
        return;
      }
      // 평면은 xy. x 로 눕힌 뒤(YXZ 순서라 나중에 적용) y 로 돌려 그림 윗변(총알 줄)이 중심을 보게 한다
      const place = (o: THREE.Object3D, y: number) => {
        o.position.set(seat.pos[0], y, seat.pos[2]);
        o.rotation.set(-Math.PI / 2, seat.yaw, 0);
        o.scale.set(seat.scale, seat.scale, 1);
      };
      place(rim, 0.003);
      place(board, 0.005);
      place(shade, 0.007);
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
    const t = this.rimTargets[index];
    if (t) t.set(RIM_COLOR[tone]);
    const shade = this.shades[index];
    if (shade) shade.visible = tone === 'dead';
  }

  /** 보드 테두리를 잠깐 물들인다 */
  flash(index: number, tone: 'red' | 'green' | 'gold', ms: number, now: number) {
    if (index < 0 || index >= this.rims.length) return;
    this.flashes[index] = { until: now + ms, color: new THREE.Color(FLASH_COLOR[tone]) };
  }

  /** 색을 부드럽게 붙인다. 아직 움직이는 중이면 true */
  tick(dt: number, now: number): boolean {
    let moving = false;
    const k = 1 - Math.exp(-8 * dt);
    this.rims.forEach((m, i) => {
      const c = m.material.color;
      const f = this.flashes[i];
      if (f && now >= f.until) this.flashes[i] = null;
      const t = f && now < f.until ? f.color : this.rimTargets[i];
      if (Math.abs(c.r - t.r) + Math.abs(c.g - t.g) + Math.abs(c.b - t.b) < 0.004) return;
      c.lerp(t, k);
      moving = true;
    });
    return moving;
  }
}
