import { CHARACTERS, SECTS } from '@cmth/sim';
import { sanitizeTeam, TEAM_SIZE, type PlayerProgress } from '../state/progress';
import { heroStats } from '../state/heroInfo';

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

/**
 * Interactive team editor. The player picks 1–6 owned characters and orders them:
 * index 0 stands at the front line and engages first, so ordering is tactical.
 * Edits are applied live via `onSetTeam` (App persists them).
 */
export function TeamSelect({
  progress,
  onSetTeam,
  onInspect,
}: {
  progress: PlayerProgress;
  onSetTeam: (ids: string[]) => void;
  onInspect: (defId: string) => void;
}) {
  const team = sanitizeTeam(progress.team ?? [], progress.chars);
  const inTeam = new Set(team);
  const bench = Object.keys(progress.chars).filter((id) => !inTeam.has(id));
  const full = team.length >= TEAM_SIZE;

  const add = (id: string) => {
    if (full || inTeam.has(id)) return;
    onSetTeam([...team, id]);
  };
  const remove = (id: string) => {
    if (team.length <= 1) return; // keep at least one fighter
    onSetTeam(team.filter((x) => x !== id));
  };
  const swap = (i: number, j: number) => {
    if (j < 0 || j >= team.length) return;
    const next = [...team];
    [next[i], next[j]] = [next[j]!, next[i]!];
    onSetTeam(next);
  };

  return (
    <div>
      {/* Active formation */}
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-sm font-bold">
          Ra trận <span className="text-gold">{team.length}</span>
          <span className="text-muted">/{TEAM_SIZE}</span>
        </span>
        <span className="text-[11px] text-muted">Vị trí 1 = tuyến đầu, hứng đòn trước</span>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {Array.from({ length: TEAM_SIZE }).map((_, i) => {
          const id = team[i];
          if (!id) {
            return (
              <div
                key={`empty-${i}`}
                className="grid min-h-[104px] place-items-center rounded-xl border-2 border-dashed border-white/15 text-2xl text-white/25"
              >
                +
              </div>
            );
          }
          const def = CHARACTERS[id]!;
          const cp = progress.chars[id]!;
          const color = hex(SECTS[def.sect].color);
          const ranged = heroStats(id, cp.level).ranged;
          return (
            <div
              key={id}
              className="relative flex flex-col rounded-xl border-2 p-1.5"
              style={{ borderColor: color }}
            >
              <span className="absolute -left-1.5 -top-1.5 grid h-5 w-5 place-items-center rounded-full bg-gold text-[11px] font-extrabold text-[#2a1c00]">
                {i + 1}
              </span>
              <button
                onClick={() => onInspect(id)}
                className="flex flex-1 flex-col items-center hover:opacity-80"
                title="Xem chi tiết"
              >
                <div className="mb-1 h-8 w-full rounded-lg" style={{ background: color }} />
                <div className="w-full truncate text-center text-xs font-bold">{def.name}</div>
                <div className="text-[11px] text-muted">
                  Lv {cp.level} · {ranged ? '🏹' : '🗡️'}
                </div>
              </button>
              <div className="mt-1 flex items-center justify-between gap-1">
                <button
                  onClick={() => swap(i, i - 1)}
                  disabled={i === 0}
                  className="grid h-5 w-5 place-items-center rounded bg-white/10 text-xs hover:bg-white/20 disabled:opacity-30"
                  title="Lên tuyến trước"
                >
                  ◀
                </button>
                <button
                  onClick={() => remove(id)}
                  disabled={team.length <= 1}
                  className="grid h-5 flex-1 place-items-center rounded bg-red-500/15 text-xs text-red-300 hover:bg-red-500/30 disabled:opacity-30"
                  title="Bỏ khỏi đội"
                >
                  ✕
                </button>
                <button
                  onClick={() => swap(i, i + 1)}
                  disabled={i === team.length - 1}
                  className="grid h-5 w-5 place-items-center rounded bg-white/10 text-xs hover:bg-white/20 disabled:opacity-30"
                  title="Lùi tuyến sau"
                >
                  ▶
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bench */}
      <div className="mb-1 mt-4 flex items-baseline justify-between">
        <span className="text-sm font-bold">Tướng dự bị</span>
        {full && <span className="text-[11px] text-gold">Đội đã đủ {TEAM_SIZE} — bỏ bớt để thêm</span>}
      </div>
      {bench.length === 0 ? (
        <p className="rounded-xl bg-black/20 py-4 text-center text-xs text-muted">
          Tất cả tướng đang ra trận.
        </p>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {bench.map((id) => {
            const def = CHARACTERS[id]!;
            const cp = progress.chars[id]!;
            const color = hex(SECTS[def.sect].color);
            return (
              <div
                key={id}
                className={`rounded-xl border-2 p-2 text-center ${full ? 'opacity-50' : ''}`}
                style={{ borderColor: color }}
              >
                <button
                  onClick={() => onInspect(id)}
                  className="flex w-full flex-col items-center hover:opacity-80"
                >
                  <div className="mb-1 h-8 w-full rounded-lg" style={{ background: color }} />
                  <div className="w-full truncate text-xs font-bold">{def.name}</div>
                  <div className="text-[11px] text-muted">{SECTS[def.sect].name}</div>
                </button>
                <button
                  onClick={() => add(id)}
                  disabled={full}
                  className="mt-1 w-full rounded bg-gold/20 py-1 text-xs font-bold text-gold hover:bg-gold/30 disabled:opacity-40"
                >
                  + Vào đội
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
