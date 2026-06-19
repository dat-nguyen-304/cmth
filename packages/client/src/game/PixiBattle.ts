import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  MELEE_RANGE_MAX,
  SECTS,
  type BattleEvent,
  type Combatant,
  type SectId,
} from '@cmth/sim';
import { SECT_ULT } from '../state/heroInfo';
import { BattleRunner } from './BattleRunner';

const UNIT = 38;
const DEATH_FADE = 0.6; // seconds a corpse takes to fade out and vanish
const LUNGE_T = 0.12; // seconds a melee lunge lasts
const LUNGE_DIST = 14; // how far (px) a melee unit jabs toward its target
const PROJECTILE_SPEED = 920; // px/s a ranged shot travels
const ULT_FOCUS_T = 1.0; // seconds the ult spotlight (dim others + name) lasts
const ULT_VEIL_PEAK = 0.62; // max darkness of the spotlight veil

interface UnitView {
  container: Container;
  body: Graphics;
  hp: Graphics;
  flash: number; // seconds of hit flash remaining
  pulse: number; // seconds of ult pulse remaining
  deathFade: number; // seconds left in the death fade-out (0 once gone)
  lunge: number; // seconds of melee-jab offset remaining
  lungeDir: 1 | -1; // direction of the current jab
}

interface Fx {
  g: Graphics;
  life: number;
  max: number;
}

/** A ranged shot in flight: travels from spawn point to a fixed target point. */
interface Projectile {
  g: Graphics;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  life: number; // seconds left until impact
  max: number;
  color: number;
  targetUid: number; // who flashes on impact
}

/** Darken an RGB color by factor f (0..1). */
function shade(color: number, f: number): number {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  return (Math.round(r * f) << 16) | (Math.round(g * f) << 8) | Math.round(b * f);
}

function hpColor(frac: number): number {
  if (frac > 0.5) return 0x4caf50;
  if (frac > 0.25) return 0xffb300;
  return 0xe53935;
}

/**
 * Renders a BattleRunner with PixiJS. Placeholder block art for Phase 1: each
 * combatant is a sect-colored rounded square with an HP bar; hits flash, ults
 * pulse and emit a colored ring. Rendering is read-only over the sim state.
 */
export class PixiBattle {
  readonly app = new Application();
  private readonly world = new Container();
  private readonly veil = new Graphics(); // dims the field during an ult
  private readonly spotlightLayer = new Container(); // the caster, lifted above the veil
  private readonly fxLayer = new Container();
  private readonly nameLayer = new Container(); // ult name text, on top
  private readonly units = new Map<number, UnitView>();
  private fx: Fx[] = [];
  private projectiles: Projectile[] = [];
  /** Active ult spotlight, or null. */
  private ult: { uid: number; life: number; max: number; nameText: Text } | null = null;
  private liftedUid: number | null = null; // caster currently reparented into spotlightLayer
  private destroyed = false;

  async init(
    parent: HTMLElement,
    runner: BattleRunner,
    onFrame: (events: BattleEvent[]) => void,
  ): Promise<void> {
    await this.app.init({
      width: ARENA_WIDTH,
      height: ARENA_HEIGHT,
      background: 0x161620,
      antialias: true,
    });
    if (this.destroyed) {
      this.app.destroy(true);
      return;
    }

    parent.appendChild(this.app.canvas);
    this.drawFloor();
    // Layer order (bottom→top): floor, units, veil, spotlit caster, fx, ult name.
    this.veil.rect(0, 0, ARENA_WIDTH, ARENA_HEIGHT).fill({ color: 0x000000 });
    this.veil.alpha = 0;
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.veil);
    this.app.stage.addChild(this.spotlightLayer);
    this.app.stage.addChild(this.fxLayer);
    this.app.stage.addChild(this.nameLayer);

    for (const c of runner.state.combatants) this.units.set(c.uid, this.makeUnit(c));

    this.app.ticker.add((ticker) => {
      const dt = ticker.deltaMS / 1000;
      const events = runner.update(ticker.deltaMS);
      this.applyEvents(runner, events);
      this.renderFrame(runner, dt);
      onFrame(events);
    });
  }

  destroy(): void {
    this.destroyed = true;
    try {
      this.app.destroy(true, { children: true });
    } catch {
      /* app may not have finished init; ignore */
    }
  }

  private drawFloor(): void {
    const floor = new Graphics()
      .rect(0, ARENA_HEIGHT * 0.5, ARENA_WIDTH, ARENA_HEIGHT * 0.5)
      .fill({ color: 0x1e1e2c });
    this.app.stage.addChild(floor);
  }

  private makeUnit(c: Combatant): UnitView {
    const container = new Container();
    const half = UNIT / 2;
    const fill = c.side === 0 ? SECTS[c.sect].color : shade(SECTS[c.sect].color, 0.7);

    const body = new Graphics()
      .roundRect(-half, -half, UNIT, UNIT, 7)
      .fill(fill)
      .stroke({ width: 3, color: c.side === 0 ? 0x39d3ff : 0xff5a5a, alpha: 0.9 });

    const hp = new Graphics();

    const label = new Text({
      text: c.name,
      style: { fontFamily: 'sans-serif', fontSize: 10, fill: 0xeeeeee },
    });
    label.anchor.set(0.5, 1);
    // Units share one row and pack close together, so stagger labels vertically
    // (by uid parity) to keep adjacent names from overlapping.
    label.y = -half - 14 - (c.uid % 2) * 13;

    container.addChild(body, hp, label);
    this.world.addChild(container);
    return { container, body, hp, flash: 0, pulse: 0, deathFade: DEATH_FADE, lunge: 0, lungeDir: 1 };
  }

  private applyEvents(runner: BattleRunner, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.type === 'attack') {
        const src = runner.state.combatants.find((x) => x.uid === e.source);
        const tgt = runner.state.combatants.find((x) => x.uid === e.target);
        if (!tgt) continue;
        const color = src ? SECTS[src.sect].color : 0xffffff;
        const ranged = src ? src.attackRange > MELEE_RANGE_MAX : false;
        if (ranged && src) {
          // Fire a visible shot; the hit flash + impact land when it arrives.
          this.spawnProjectile(src.pos, tgt.pos, color, e.target);
        } else {
          // Melee: jab toward the target, flash it now, spark on contact.
          if (src) {
            const sv = this.units.get(src.uid);
            if (sv) {
              sv.lunge = LUNGE_T;
              sv.lungeDir = src.facing;
            }
          }
          const tv = this.units.get(e.target);
          if (tv) tv.flash = 0.12;
          this.spawnRing(tgt.pos.x, tgt.pos.y, color, 0.22, 16);
        }
      } else if (e.type === 'ult') {
        const v = this.units.get(e.source);
        if (v) v.pulse = 0.3;
        const c = runner.state.combatants.find((x) => x.uid === e.source);
        if (c) this.spawnRing(c.pos.x, c.pos.y, SECTS[e.sect].color, 0.55, 110);
        this.focusUlt(e.source, e.sect);
      } else if (e.type === 'heal' && e.amount > 0) {
        const c = runner.state.combatants.find((x) => x.uid === e.target);
        if (c) this.spawnRing(c.pos.x, c.pos.y, 0x66ff99, 0.45, 60);
      } else if (e.type === 'death') {
        const v = this.units.get(e.uid);
        if (v) v.deathFade = DEATH_FADE; // begin fading the corpse out
      }
    }
  }

  private spawnRing(x: number, y: number, color: number, life: number, radius: number): void {
    const g = new Graphics().circle(0, 0, radius).stroke({ width: 4, color, alpha: 0.9 });
    g.x = x;
    g.y = y;
    g.scale.set(0.3);
    this.fxLayer.addChild(g);
    this.fx.push({ g, life, max: life });
  }

  private spawnProjectile(
    from: { x: number; y: number },
    to: { x: number; y: number },
    color: number,
    targetUid: number,
  ): void {
    const dist = Math.hypot(to.x - from.x, to.y - from.y);
    const life = Math.min(0.35, Math.max(0.05, dist / PROJECTILE_SPEED));
    const g = new Graphics()
      .circle(0, 0, 6)
      .fill({ color })
      .stroke({ width: 2, color: 0xffffff, alpha: 0.6 });
    g.x = from.x;
    g.y = from.y;
    this.fxLayer.addChild(g);
    this.projectiles.push({ g, fromX: from.x, fromY: from.y, toX: to.x, toY: to.y, life, max: life, color, targetUid });
  }

  /**
   * Spotlight the ult: dim the whole field (veil), lift the caster above it so it
   * stays lit, and show the move's name big above its head. A new ult replaces any
   * current spotlight.
   */
  private focusUlt(uid: number, sect: SectId): void {
    this.endUltFocus();
    const v = this.units.get(uid);
    if (!v) return;
    this.spotlightLayer.addChild(v.container); // moves it out of the (dimmed) world
    this.liftedUid = uid;

    const text = new Text({
      text: SECT_ULT[sect].name,
      style: {
        fontFamily: 'sans-serif',
        fontSize: 34,
        fontWeight: '900',
        fill: SECTS[sect].color,
        stroke: { color: 0x000000, width: 5 },
        align: 'center',
      },
    });
    text.anchor.set(0.5, 1);
    this.nameLayer.addChild(text);
    this.ult = { uid, life: ULT_FOCUS_T, max: ULT_FOCUS_T, nameText: text };
  }

  private endUltFocus(): void {
    if (this.liftedUid !== null) {
      const v = this.units.get(this.liftedUid);
      if (v && v.container.parent !== this.world) this.world.addChild(v.container);
      this.liftedUid = null;
    }
    if (this.ult) {
      this.ult.nameText.destroy();
      this.ult = null;
    }
    this.veil.alpha = 0;
  }

  private renderFrame(runner: BattleRunner, dt: number): void {
    const half = UNIT / 2;
    for (const c of runner.state.combatants) {
      const v = this.units.get(c.uid);
      if (!v) continue;
      const p = runner.renderPos(c);
      v.container.x = p.x;
      v.container.y = p.y;

      const frac = Math.max(0, c.hp / c.maxHp);
      v.hp.clear();
      v.hp.rect(-half, -half - 9, UNIT, 4).fill({ color: 0x000000, alpha: 0.6 });
      if (frac > 0) v.hp.rect(-half, -half - 9, UNIT * frac, 4).fill(hpColor(frac));

      if (!c.alive) {
        // Fade the corpse out and shrink it, then leave it fully invisible — no
        // lingering grey ghost on the field.
        v.deathFade = Math.max(0, v.deathFade - dt);
        const t = v.deathFade / DEATH_FADE; // 1 -> 0
        v.container.alpha = t * 0.85;
        v.body.tint = 0x888888;
        v.container.scale.set(0.55 + 0.45 * t);
        continue;
      }

      v.container.alpha = 1;
      v.body.tint = v.flash > 0 ? 0xff8a8a : 0xffffff;
      if (v.flash > 0) v.flash = Math.max(0, v.flash - dt);

      // Melee jab: pop toward the target, then ease back to the resting position.
      if (v.lunge > 0) {
        v.lunge = Math.max(0, v.lunge - dt);
        v.container.x = p.x + v.lungeDir * LUNGE_DIST * (v.lunge / LUNGE_T);
      }

      if (v.pulse > 0) {
        v.pulse = Math.max(0, v.pulse - dt);
        v.container.scale.set(1 + 0.4 * (v.pulse / 0.3));
      } else {
        v.container.scale.set(1);
      }
    }

    // Ult spotlight: ramp the veil (in fast, hold, out), keep the name above the
    // caster, pop it in and fade it out at the end.
    if (this.ult) {
      this.ult.life -= dt;
      const elapsed = this.ult.max - this.ult.life;
      const inDur = 0.15;
      const outDur = 0.35;
      let a = ULT_VEIL_PEAK;
      if (elapsed < inDur) a = ULT_VEIL_PEAK * (elapsed / inDur);
      else if (this.ult.life < outDur) a = ULT_VEIL_PEAK * Math.max(0, this.ult.life / outDur);
      this.veil.alpha = a;

      const v = this.units.get(this.ult.uid);
      const name = this.ult.nameText;
      if (v) {
        name.x = v.container.x;
        name.y = v.container.y - 64;
      }
      name.scale.set(0.7 + 0.3 * Math.min(1, elapsed / 0.18));
      name.alpha = this.ult.life < outDur ? Math.max(0, this.ult.life / outDur) : 1;

      if (this.ult.life <= 0) this.endUltFocus();
    }

    // Ranged shots in flight: move toward the target; flash + spark on impact.
    this.projectiles = this.projectiles.filter((p) => {
      p.life -= dt;
      const t = 1 - Math.max(0, p.life) / p.max;
      p.g.x = p.fromX + (p.toX - p.fromX) * t;
      p.g.y = p.fromY + (p.toY - p.fromY) * t;
      if (p.life <= 0) {
        const tv = this.units.get(p.targetUid);
        if (tv) tv.flash = 0.12;
        this.spawnRing(p.toX, p.toY, p.color, 0.22, 14);
        p.g.destroy();
        return false;
      }
      return true;
    });

    // Transient ring effects.
    this.fx = this.fx.filter((f) => {
      f.life -= dt;
      if (f.life <= 0) {
        f.g.destroy();
        return false;
      }
      const t = 1 - f.life / f.max;
      f.g.scale.set(0.3 + t * 1.4);
      f.g.alpha = 1 - t;
      return true;
    });
  }
}
