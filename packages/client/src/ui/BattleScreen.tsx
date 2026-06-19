import { useEffect, useReducer, useRef, useState } from 'react';
import { ENERGY_MAX, SECTS, type Combatant, type Recruit, type Side } from '@cmth/sim';
import { SECT_ULT } from '../state/heroInfo';
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

/** A single character card in the HUD panel. */
function CharCard({
  c,
  isPlayer,
  onUlt,
}: {
  c: Combatant;
  isPlayer: boolean;
  onUlt?: () => void;
}) {
  const hpFrac = Math.max(0, c.hp / c.maxHp);
  const energyFrac = Math.min(1, c.energy / ENERGY_MAX);
  const ultReady = c.alive && c.energy >= ENERGY_MAX;
  const sectColor = hex(SECTS[c.sect].color);
  const ultInfo = SECT_ULT[c.sect];

  return (
    <button
      className={`flex flex-col items-center gap-0.5 w-16 p-1.5 border-none rounded-[10px] bg-white/[0.04] relative
        transition-all duration-150 cursor-default
        enabled:hover:-translate-y-0.5 enabled:hover:bg-white/[0.08]
        enabled:active:translate-y-0 enabled:active:scale-[0.97]
        ${!c.alive ? 'opacity-35' : ''}
        ${ultReady && isPlayer ? 'cursor-pointer animate-ult-pulse' : ''}`}
      disabled={!isPlayer || !ultReady}
      onClick={onUlt}
      title={
        !isPlayer
          ? c.name
          : ultReady
            ? `${ultInfo.name} — Bấm để tung chiêu!`
            : `${c.name} — Đang tích nộ (${Math.floor(energyFrac * 100)}%)`
      }
    >
      {/* Ult icon + energy bar grouped together */}
      <div className="flex flex-col items-center gap-0.5 w-[26px]">
        <div
          className={`w-[26px] h-[26px] rounded-[6px] border-2 grid place-items-center shrink-0
            transition-all duration-300 ${ultReady ? 'shadow-[0_0_10px_rgba(57,211,255,0.5)]' : ''}`}
          style={{
            borderColor: ultReady ? '#39d3ff' : 'rgba(255,255,255,0.15)',
            background: ultReady
              ? `radial-gradient(circle, ${sectColor}55, ${sectColor}22)`
              : 'rgba(0,0,0,0.5)',
          }}
        >
          <span className={`text-xs font-extrabold leading-none ${ultReady ? 'text-white' : 'text-white/70'}`}>
            {ultInfo.name.charAt(0)}
          </span>
        </div>
        {/* Energy bar (blue) — same width as ult icon */}
        <div className="w-full h-1 rounded-sm bg-black/50 overflow-hidden">
          <div
            className="h-full rounded-sm transition-[width] duration-150 linear"
            style={{
              width: `${energyFrac * 100}%`,
              background: 'linear-gradient(90deg, #1e90ff, #39d3ff)',
            }}
          />
        </div>
      </div>

      {/* Main avatar */}
      <div
        className="w-10 h-10 rounded-[9px] grid place-items-center relative shrink-0"
        style={{
          background: `linear-gradient(135deg, ${sectColor}, ${sectColor}88)`,
          border: `2.5px solid ${isPlayer ? '#39d3ff' : '#ff5a5a'}`,
        }}
      >
        <span className="text-[17px] font-black text-white/85 leading-none drop-shadow-sm">
          {c.name.charAt(0)}
        </span>
        {!c.alive && (
          <span className="absolute inset-0 grid place-items-center text-[26px] text-red-400 drop-shadow">
            ✕
          </span>
        )}
      </div>

      {/* HP bar (red) — full width below the avatar */}
      <div className="w-full h-[5px] rounded-sm bg-black/50 overflow-hidden">
        <div
          className="h-full rounded-sm transition-[width] duration-150 linear"
          style={{
            width: `${hpFrac * 100}%`,
            background: 'linear-gradient(90deg, #c0392b, #e74c3c)',
          }}
        />
      </div>

      {/* Name */}
      <span className="text-[9px] font-bold text-white/70 max-w-full truncate leading-tight">
        {c.name}
      </span>
    </button>
  );
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
  const enemyUnits = runner ? runner.state.combatants.filter((c) => c.side === 1) : [];
  const won = runner?.winner === 0;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden">
      {/* Arena — stretches to fill available space */}
      <div className="relative flex-1 min-h-0 flex justify-center items-center bg-[#0c0c14]">
        <div className="arena w-full h-full" ref={hostRef} />
        {finished && (
          <div
            className={`absolute left-1/2 top-[40%] -translate-x-1/2 -translate-y-1/2
              rounded-2xl bg-black/75 px-9 py-2.5 text-5xl font-black tracking-widest
              drop-shadow-lg animate-pop-in z-10
              ${won ? 'text-green-400' : 'text-red-400'}`}
          >
            {won ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
          </div>
        )}
      </div>

      {/* HUD Panel — single row: TA (left) | divider | ĐỊCH (right) */}
      <div className="shrink-0 w-full border-t border-white/[0.06] px-6 py-2"
        style={{ background: 'linear-gradient(180deg, #161622dd, #0b0b14)' }}
      >
        <div className="flex items-center w-full">
          {/* Player group — left side */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <span className="vertical-label text-accent">TA</span>
            <div className="flex flex-nowrap gap-1.5">
              {playerUnits.map((c) => (
                <CharCard
                  key={c.uid}
                  c={c}
                  isPlayer={true}
                  onUlt={() => runnerRef.current?.queueUlt(c.uid)}
                />
              ))}
            </div>
          </div>

          {/* Vertical divider */}
          <div className="w-px self-stretch mx-2.5 bg-gradient-to-b from-transparent via-white/12 to-transparent" />

          {/* Enemy group — right side */}
          <div className="flex items-center gap-2 flex-1 justify-center">
            <div className="flex flex-nowrap gap-1.5">
              {enemyUnits.map((c) => (
                <CharCard key={c.uid} c={c} isPlayer={false} />
              ))}
            </div>
            <span className="vertical-label text-red-400">ĐỊCH</span>
          </div>
        </div>
        <p className="text-center text-[11px] text-muted mt-1">Bấm chân dung để tung chiêu cuối khi thanh nộ đầy.</p>
      </div>
    </div>
  );
}
