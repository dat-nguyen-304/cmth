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
    let finishedFlag = false;

    pixi
      .init(hostRef.current!, runner, () => {
        forceRender();
        if (runner.finished && !finishedFlag) finishedFlag = true;
      })
      .catch((err) => console.error('Pixi init failed', err));

    return () => pixi.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect the runner's terminal state into React.
  useEffect(() => {
    if (finished) return;
    const id = window.setInterval(() => {
      if (runnerRef.current?.finished) setFinished(true);
    }, 100);
    return () => window.clearInterval(id);
  }, [finished]);

  // After a short victory pause, hand control back.
  useEffect(() => {
    if (!finished) return;
    const id = window.setTimeout(() => onFinish(runnerRef.current?.winner ?? null), 1400);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const runner = runnerRef.current;
  const playerUnits = runner ? runner.state.combatants.filter((c) => c.side === 0) : [];

  return (
    <div className="screen battle">
      <div className="arena-wrap">
        <div className="arena" ref={hostRef} />
        {finished && (
          <div className={`banner ${runner?.winner === 0 ? 'win' : 'lose'}`}>
            {runner?.winner === 0 ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
          </div>
        )}
      </div>

      <div className="portraits">
        {playerUnits.map((c) => {
          const ready = c.alive && c.energy >= ENERGY_MAX;
          return (
            <button
              key={c.uid}
              className={`portrait ${ready ? 'ready' : ''} ${!c.alive ? 'dead' : ''}`}
              style={{ borderColor: hex(SECTS[c.sect].color) }}
              disabled={!ready}
              onClick={() => runnerRef.current?.queueUlt(c.uid)}
              title={ready ? 'Tung chiêu cuối!' : 'Đang tích nộ'}
            >
              <span className="p-name">{c.name}</span>
              <span className="ebar">
                <span
                  className="efill"
                  style={{ width: `${Math.min(100, (c.energy / ENERGY_MAX) * 100)}%` }}
                />
              </span>
              {!c.alive && <span className="ko">✕</span>}
            </button>
          );
        })}
      </div>
      <p className="hint">Bấm chân dung để tung chiêu cuối khi thanh nộ đầy.</p>
    </div>
  );
}
