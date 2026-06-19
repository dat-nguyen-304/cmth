import { useEffect, useState } from 'react';
import { CHARACTERS, SECTS, type Recruit } from '@cmth/sim';
import {
  currentStamina,
  STAMINA_PER_BATTLE,
  winRewards,
  type PlayerProgress,
} from '../state/progress';
import { areaName, buildEnemyTeam } from '../state/roster';
import { heroStats } from '../state/heroInfo';
import { TeamSelect } from './TeamSelect';

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

interface Props {
  progress: PlayerProgress;
  onSetTeam: (ids: string[]) => void;
  onLaunch: () => void;
  onBack: () => void;
}

/**
 * Pre-battle briefing: inspect the enemy team, see the win rewards, and adjust your
 * formation before committing stamina. "Xuất Chiến" spends stamina and starts the fight.
 */
export function PrepareScreen({ progress, onSetTeam, onLaunch, onBack }: Props) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stage = progress.stage;
  const enemy = buildEnemyTeam(stage);
  const reward = winRewards(stage);
  const stamina = currentStamina(progress, now);
  const canFight = stamina >= STAMINA_PER_BATTLE;

  return (
    <div className="mx-auto w-full max-w-4xl p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <button
          onClick={onBack}
          className="rounded-xl border border-white/10 bg-panel px-4 py-2 text-sm font-bold hover:bg-white/10"
        >
          ← Quay lại
        </button>
        <div className="text-right">
          <div className="text-lg font-black text-gold">Màn {stage}</div>
          <div className="text-xs text-muted">{areaName(stage)}</div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Enemy intel */}
        <section className="rounded-2xl border border-red-400/20 bg-panel p-4">
          <h3 className="mb-3 flex items-center gap-2 font-bold text-red-300">
            ⚔️ Quân địch <span className="text-xs text-muted">({enemy.length} tướng)</span>
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {enemy.map((r, i) => (
              <EnemyCard key={i} recruit={r} />
            ))}
          </div>
        </section>

        {/* Win rewards */}
        <section className="rounded-2xl border border-gold/20 bg-panel p-4">
          <h3 className="mb-3 font-bold text-gold">🎁 Phần thưởng khi thắng</h3>
          <div className="space-y-2 text-[15px]">
            <Reward icon="💰" label="Vàng" value={`+${reward.gold}`} />
            <Reward icon="✨" label="EXP mỗi tướng" value={`+${reward.exp}`} />
            <Reward icon="掌" label="Chưởng Môn EXP" value={`+${reward.playerExp}`} />
          </div>
          <p className="mt-3 rounded-lg bg-black/20 px-3 py-2 text-xs text-muted">
            Thắng để mở <b className="text-white/80">Màn {stage + 1}</b>. Thua vẫn nhận chút
            vàng &amp; EXP an ủi.
          </p>
        </section>
      </div>

      {/* Your formation (editable) */}
      <section className="mt-4 rounded-2xl border border-white/10 bg-panel p-4">
        <h3 className="mb-3 font-bold text-accent">🛡️ Đội hình của bạn</h3>
        <TeamSelect progress={progress} onSetTeam={onSetTeam} onInspect={() => {}} />
      </section>

      {/* Launch */}
      <div className="sticky bottom-0 mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-panel/95 p-3 backdrop-blur">
        <div className="text-sm">
          <span className="text-muted">Thể lực: </span>
          <b className={canFight ? 'text-white' : 'text-red-300'}>{stamina}</b>
          <span className="text-muted"> · tốn {STAMINA_PER_BATTLE}⚡</span>
        </div>
        <button
          onClick={onLaunch}
          disabled={!canFight}
          className="rounded-xl bg-gradient-to-b from-gold to-[#d99b27] px-8 py-3 text-lg font-extrabold text-[#2a1c00] shadow-[0_4px_0_#0004] active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:grayscale"
        >
          {canFight ? `Xuất Chiến −${STAMINA_PER_BATTLE}⚡` : 'Không đủ thể lực'}
        </button>
      </div>
    </div>
  );
}

function EnemyCard({ recruit }: { recruit: Recruit }) {
  const def = CHARACTERS[recruit.defId]!;
  const level = recruit.level ?? 1;
  const s = heroStats(recruit.defId, level);
  const color = hex(SECTS[def.sect].color);
  return (
    <div className="rounded-xl border-2 p-2 text-center" style={{ borderColor: color }}>
      <div className="mb-1 h-8 w-full rounded-lg" style={{ background: color }} />
      <div className="truncate text-xs font-bold">{def.name}</div>
      <div className="text-[11px] text-muted">
        Lv {level} · {s.ranged ? '🏹' : '🗡️'}
      </div>
      <div className="mt-1 flex justify-center gap-2 text-[11px] text-muted">
        <span>❤️{s.hp}</span>
        <span>🗡{s.atk}</span>
        <span>⚡{s.atkSpeed.toFixed(1)}</span>
      </div>
    </div>
  );
}

function Reward({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
      <span>
        {icon} {label}
      </span>
      <b className="text-gold">{value}</b>
    </div>
  );
}
