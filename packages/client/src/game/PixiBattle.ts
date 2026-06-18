import { Application, Container, Graphics, Text } from 'pixi.js';
import {
  ARENA_HEIGHT,
  ARENA_WIDTH,
  SECTS,
  type BattleEvent,
  type Combatant,
} from '@cmth/sim';
import { BattleRunner } from './BattleRunner';

const UNIT = 38;
const DEATH_FADE = 0.6; // seconds a corpse takes to fade out and vanish

interface UnitView {
  container: Container;
  body: Graphics;
  hp: Graphics;
  flash: number; // seconds of hit flash remaining
  pulse: number; // seconds of ult pulse remaining
  deathFade: number; // seconds left in the death fade-out (0 once gone)
}

interface Fx {
  g: Graphics;
  life: number;
  max: number;
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
  private readonly fxLayer = new Container();
  private readonly units = new Map<number, UnitView>();
  private fx: Fx[] = [];
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
    this.app.stage.addChild(this.world);
    this.app.stage.addChild(this.fxLayer);

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
    return { container, body, hp, flash: 0, pulse: 0, deathFade: DEATH_FADE };
  }

  private applyEvents(runner: BattleRunner, events: BattleEvent[]): void {
    for (const e of events) {
      if (e.type === 'attack') {
        const v = this.units.get(e.target);
        if (v) v.flash = 0.12;
      } else if (e.type === 'ult') {
        const v = this.units.get(e.source);
        if (v) v.pulse = 0.3;
        const c = runner.state.combatants.find((x) => x.uid === e.source);
        if (c) this.spawnRing(c.pos.x, c.pos.y, SECTS[e.sect].color, 0.55, 110);
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

      if (v.pulse > 0) {
        v.pulse = Math.max(0, v.pulse - dt);
        v.container.scale.set(1 + 0.4 * (v.pulse / 0.3));
      } else {
        v.container.scale.set(1);
      }
    }

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
