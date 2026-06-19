import { useEffect, useReducer, useRef, useState } from 'react';
import { ENERGY_MAX, SECTS, type Recruit, type Side } from '@cmth/sim';
import { BattleRunner } from '../game/BattleRunner';
import { PixiBattle } from '../game/PixiBattle';

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

interface Props {
  playerTeam: Recruit[];
  enemyTeam: Recruit[];
  seed: number;
  onFinish: (winner: Side | null) => void;
}

export function BattleScreen({ playerTeam, enemyTeam, seed, onFinish }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const runnerRef = useRef<BattleRunner | null>(null);
  const [, forceRender] = useReducer((x: number) => x + 1, 0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    const runner = new BattleRunner(playerTeam, enemyTeam, seed);
    runnerRef.current = runner;
    const pixi = new PixiBattle();
    pixi.init(hostRef.current!, runner, () => forceRender()).catch((err) =>
      console.error('Pixi init failed', err),
    );
    return () => pixi.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      if (runnerRef.current?.finished) setFinished(true);
    }, 100);
    return () => window.clearInterval(id);
  }, [finished]);

  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => onFinish(runnerRef.current?.winner ?? null), 1400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const runner = runnerRef.current;
  const playerUnits = runner ? runner.state.combatants.filter((c) => c.side === 0) : [];
  const won = runner?.winner === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 p-4">
      <div className="relative flex w-full justify-center">
        <div className="arena" ref={hostRef} />
        {finished && (
          <div
            className={`absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/70 px-8 py-2.5 text-5xl font-black tracking-widest drop-shadow-lg ${
              won ? 'text-green-400' : 'text-red-400'
            }`}
          >
            {won ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-2.5">
        {playerUnits.map((c) => {
          const ready = c.alive && c.energy >= ENERGY_MAX;
          return (
            <button
              key={c.uid}
              disabled={!ready}
              onClick={() => runnerRef.current?.queueUlt(c.uid)}
              title={ready ? 'Tung chiêu cuối!' : 'Đang tích nộ'}
              style={{ borderColor: hex(SECTS[c.sect].color) }}
              className={`relative w-28 rounded-xl border-2 bg-panel p-2 text-left transition disabled:cursor-default ${
                ready ? 'shadow-[0_0_0_2px_var(--color-gold),0_0_18px_var(--color-gold)] hover:-translate-y-0.5' : ''
              } ${!c.alive ? 'opacity-40' : ''}`}
            >
              <span className="mb-1.5 block truncate text-[13px] font-bold">{c.name}</span>
              <span className="block h-2 overflow-hidden rounded bg-black/40">
                <span
                  className="block h-full bg-gradient-to-r from-accent to-[#b06dff]"
                  style={{ width: `${Math.min(100, (c.energy / ENERGY_MAX) * 100)}%` }}
                />
              </span>
              {!c.alive && (
                <span className="absolute inset-0 grid place-items-center text-3xl text-red-400">✕</span>
              )}
            </button>
          );
        })}
      </div>
      <p className="text-sm text-muted">Bấm chân dung để tung chiêu cuối khi thanh nộ đầy.</p>
    </div>
  );
}
