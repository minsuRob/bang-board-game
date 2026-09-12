/**
 * 배치를 한 단계씩 돌린다. 카드는 CardHandle 을 빌려 직접 움직이고, 끝나면 돌려준다.
 */

import type { PlayerId } from '../../engine';
import { DUR, flightMs } from '../core/durations';
import { finishFx, fxStore, pushNumber, setCaption, shiftFx } from '../core/fx-store';
import {
  arcControl,
  easeInOutCubic,
  easeOutBack,
  easeOutCubic,
  hashNoise,
  lerp,
  quadBezier,
  quadBezierTangent,
  vnorm,
  vsub,
  wrapAngle,
} from '../core/math';
import { Timeline } from '../core/timeline';
import type { FxBatch, FxCommand, Vec3 } from '../core/types';
import type { Pose } from './CardHandle';
import type { CameraRig } from './CameraRig';
import type { CardWorld } from './CardWorld';
import type { FxLayer } from './FxLayer';
import type { Particles } from './Particles';

type MoveCmd = Extract<FxCommand, { k: 'moveCard' }>;

export type SequencerDeps = {
  world: CardWorld;
  rig: CameraRig;
  fx: FxLayer;
  particles: Particles;
  /** 배치가 끝났다. snap 이면 즉시 정답 자리로 */
  onBatchDone: (snap: boolean) => void;
};

const TONE_COLOR = { red: '#FF5A3C', green: '#7CE08A', gold: '#F2C14E', blue: '#6FB6FF', white: '#FFE9C0' };

export class Sequencer {
  private readonly timeline = new Timeline();
  private batch: FxBatch | null = null;
  private stepIndex = 0;
  private scale = 1;
  private salt = 0;

  constructor(private readonly deps: SequencerDeps) {}

  get busy(): boolean {
    return this.batch !== null;
  }

  /** 아직 할 일이 있으면 true */
  tick(now: number): boolean {
    const running = this.timeline.tick(now);
    if (!this.batch) {
      const next = shiftFx();
      if (!next) return running;
      this.start(next, now);
      return true;
    }
    if (!running) {
      this.stepIndex++;
      if (this.stepIndex >= this.batch.steps.length) this.finish();
      else this.runStep(now);
    }
    return true;
  }

  /** 남은 연출을 끝 상태로 보낸다 (판이 끝났거나 자리를 바꿀 때) */
  flush() {
    this.timeline.flush();
    if (this.batch) this.finish();
    let next = shiftFx();
    while (next) {
      finishFx(next);
      next = shiftFx();
    }
    this.deps.onBatchDone(true);
  }

  private start(batch: FxBatch, now: number) {
    if (batch.snap || batch.steps.length === 0) {
      finishFx(batch);
      this.deps.onBatchDone(true);
      return;
    }
    this.batch = batch;
    this.stepIndex = 0;
    this.scale = fxStore.getState().timeScale * (batch.fast ? 3 : 1);
    this.runStep(now);
  }

  private finish() {
    const b = this.batch;
    this.batch = null;
    if (b) finishFx(b);
    this.deps.onBatchDone(false);
  }

  private ms(x: number): number {
    return x / this.scale;
  }

  private runStep(now: number) {
    const step = this.batch!.steps[this.stepIndex];
    const fast = Boolean(this.batch!.fast);
    for (const cmd of step) {
      if (fast && cmd.k !== 'moveCard') continue;
      this.run(cmd, now);
    }
  }

  private seat(pid: PlayerId): Vec3 {
    return this.deps.world.seatPos(pid) ?? this.deps.world.layout?.center ?? [0, 0, 0];
  }

  private run(cmd: FxCommand, now: number) {
    const { world, rig, fx, particles } = this.deps;
    switch (cmd.k) {
      case 'moveCard':
        this.moveCard(cmd, now);
        break;

      case 'bang': {
        const from = this.seat(cmd.from);
        const to = this.seat(cmd.to);
        fx.flash(from, TONE_COLOR.gold, 0.9, this.ms(180), now, 0.35);
        fx.streak(from, to, TONE_COLOR.white, this.ms(DUR.streak), now);
        this.timeline.add({
          start: now + this.ms(DUR.streak) * 0.8,
          dur: 0,
          update: () => {
            fx.ring(to, TONE_COLOR.red, 0.5, 2.1, this.ms(DUR.ring), now + this.ms(DUR.streak) * 0.8, 1);
            fx.flash(to, TONE_COLOR.red, 1.2, this.ms(220), now + this.ms(DUR.streak) * 0.8, 0.2);
            rig.punch(vnorm(vsub(to, from)), 0.12, this.ms(140));
          },
        });
        this.timeline.add({ start: now, dur: this.ms(DUR.bang), update: () => {} });
        break;
      }

      case 'fanOut': {
        const from = this.seat(cmd.from);
        fx.flash(from, TONE_COLOR.gold, 1.2, this.ms(260), now, 0.35);
        cmd.to.forEach((pid, i) => {
          const at = now + this.ms(cmd.staggerMs) * i;
          const to = this.seat(pid);
          this.timeline.add({
            start: at,
            dur: this.ms(DUR.streak),
            update: () => {},
            done: () => fx.ring(to, TONE_COLOR.red, 0.5, 1.9, this.ms(DUR.ring), at + this.ms(DUR.streak), 1),
          });
          this.timeline.add({ start: at, dur: 0, update: () => fx.streak(from, to, TONE_COLOR.white, this.ms(DUR.streak), at) });
        });
        rig.shake(0.08, this.ms(300));
        break;
      }

      case 'shield': {
        const at = this.seat(cmd.pid);
        fx.ring(at, TONE_COLOR.blue, 0.5, 1.9, this.ms(DUR.shield), now, 1);
        fx.flash(at, TONE_COLOR.blue, 1.4, this.ms(DUR.shield), now, 0.25);
        break;
      }

      case 'seatFlash': {
        const i = world.seatIndexOf(cmd.pid);
        if (i >= 0) world.table.flash(i, cmd.tone, this.ms(DUR.flash), now);
        break;
      }

      case 'particles': {
        const at = cmd.pid ? this.seat(cmd.pid) : (world.layout?.center ?? [0, 0, 0]);
        particles.spawn(at, cmd.preset, now / 1000, 1 / Math.sqrt(this.scale));
        break;
      }

      case 'shockwave': {
        const at = cmd.pid ? this.seat(cmd.pid) : (world.layout?.center ?? [0, 0, 0]);
        const big = cmd.strength >= 3;
        fx.ring(at, big ? '#FFB060' : TONE_COLOR.red, 0.4, 1.4 + cmd.strength * 0.45, this.ms(DUR.ring), now, 0.9);
        if (big) {
          fx.flash(at, '#FFD080', 3.2, this.ms(360), now, 0.4);
          fx.ring(at, '#FFE0A0', 0.3, 3.2, this.ms(DUR.ring + 200), now + this.ms(60), 0.6);
        }
        break;
      }

      case 'cameraFocus':
        rig.focus(cmd.pid ? this.seat(cmd.pid) : null, this.ms(cmd.holdMs), now);
        break;

      case 'cameraKick': {
        const to = this.seat(cmd.toward);
        rig.punch([to[0], 0, to[2]], cmd.strength, this.ms(140));
        break;
      }

      case 'shake':
        rig.shake(cmd.strength, this.ms(cmd.ms));
        break;

      case 'number':
        pushNumber(cmd.pid, cmd.text, cmd.tone, now);
        break;

      case 'caption':
        setCaption(cmd.text, now + this.ms(cmd.ms));
        break;

      case 'wait':
        this.timeline.add({ start: now, dur: this.ms(cmd.ms), update: () => {} });
        break;
    }
  }

  private moveCard(cmd: MoveCmd, now: number) {
    const { world, fx, particles, rig } = this.deps;
    if (!world.layout) return;
    const existed = world.has(cmd.card);
    const h = world.handle(cmd.card);
    const salt = ++this.salt;

    const from: Pose = existed && h.group.visible ? { ...h.current } : world.anchorFor(cmd.from, cmd.fromIndex, cmd.fromCount);
    const to: Pose = world.anchorFor(cmd.to, cmd.toIndex, cmd.toCount);
    if (cmd.face === 'down') to.flip = Math.PI;

    h.driven = true;
    h.snap(from);
    const shadow = fx.shadow();
    const start = now + this.ms(cmd.delayMs ?? 0);

    const segments: { a: Pose; b: Pose; ms: number; lift: number; ease: (t: number) => number; hold?: number }[] = [];
    const style = cmd.style;

    if (style === 'reveal') {
      const mid = world.centerPose(0.55);
      mid.flip = 0;
      mid.scale = 1.25;
      segments.push({ a: from, b: mid, ms: flightMs('reveal') * 0.55, lift: 0.5, ease: easeOutCubic, hold: cmd.holdMs ?? DUR.revealHold });
      segments.push({ a: mid, b: to, ms: DUR.drop, lift: 0.15, ease: easeInOutCubic });
    } else if (cmd.via) {
      const at = this.seat(cmd.via);
      const hover: Pose = { ...to, pos: [at[0], 0.6, at[2]], pitch: -0.35, scale: 1.25, flip: to.flip };
      segments.push({ a: from, b: hover, ms: flightMs('arc'), lift: 0.9, ease: easeOutCubic, hold: DUR.via });
      segments.push({ a: hover, b: to, ms: DUR.drop, lift: 0.25, ease: easeInOutCubic });
    } else {
      const lift = style === 'deal' ? 0.35 : style === 'drop' ? 0.5 : style === 'scatter' ? 0.8 : 0.9;
      const ease = style === 'deal' ? easeOutCubic : style === 'deflect' ? easeOutCubic : easeInOutCubic;
      if (style === 'scatter') {
        to.pos = [to.pos[0] + (hashNoise(salt, 1) - 0.5) * 0.5, to.pos[1], to.pos[2] + (hashNoise(salt, 2) - 0.5) * 0.5];
        to.spin = (hashNoise(salt, 3) - 0.5) * 1.2;
      }
      segments.push({ a: from, b: to, ms: flightMs(style), lift, ease });
    }

    const extraSpin = style === 'deflect' ? Math.PI * 4 : style === 'scatter' ? Math.PI * 2 * (hashNoise(salt, 4) - 0.5) : 0;

    let t0 = start;
    segments.forEach((seg, si) => {
      const last = si === segments.length - 1;
      const ctrl = arcControl(seg.a.pos, seg.b.pos, seg.lift);
      const dYaw = wrapAngle(seg.b.yaw - seg.a.yaw);
      const dFlip = wrapAngle(seg.b.flip - seg.a.flip);
      const dSpin = wrapAngle(seg.b.spin - seg.a.spin) + (si === 0 ? extraSpin : 0);
      const ms = this.ms(seg.ms);
      const segStart = t0;
      this.timeline.add({
        start: segStart,
        dur: ms,
        update: (raw) => {
          const p = seg.ease(raw);
          const pos = quadBezier(seg.a.pos, ctrl, seg.b.pos, p);
          const tan = quadBezierTangent(seg.a.pos, ctrl, seg.b.pos, p);
          const horiz = Math.hypot(tan[0], tan[2]);
          const pitch = horiz > 1e-4 ? -Math.atan2(tan[1], horiz) * 0.55 : 0;
          const bulge = Math.sin(raw * Math.PI);
          h.set({
            pos,
            yaw: seg.a.yaw + dYaw * p,
            pitch: lerp(seg.a.pitch, seg.b.pitch, p) + pitch,
            roll: (style === 'deflect' ? Math.sin(raw * Math.PI * 3) * 0.5 : 0) + bulge * 0.08,
            flip: seg.a.flip + dFlip * Math.min(1, raw * 1.4),
            spin: seg.a.spin + dSpin * p,
            scale: lerp(seg.a.scale, seg.b.scale, p) + bulge * 0.22,
          });
          shadow.set(pos, pos[1], h.current.scale);
        },
        done: () => {
          if (!last) return;
          h.set({ ...seg.b });
          fx.releaseShadow(shadow);
          if (cmd.slam) {
            const slamStart = segStart + ms;
            const base = seg.b.scale;
            h.set({ scale: base * 1.28 });
            this.timeline.add({
              start: slamStart,
              dur: this.ms(DUR.slam),
              ease: easeOutBack,
              update: (p) => h.set({ scale: base * 1.28 + (base - base * 1.28) * p }),
              done: () => {
                h.set({ scale: base });
                h.driven = false;
              },
            });
            fx.ring(seg.b.pos, '#C8A060', 0.3, 1.3, this.ms(DUR.ring), slamStart, 0.55);
            particles.spawn(seg.b.pos, 'dust', slamStart / 1000, 0.9);
            rig.punch([0, -1, 0], 0.05, this.ms(110));
          } else {
            h.driven = false;
          }
        },
      });
      t0 += ms + this.ms(seg.hold ?? 0);
    });
  }
}
