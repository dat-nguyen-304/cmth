import { useEffect, useState, type ReactNode } from 'react';
import { CHARACTERS, SECTS } from '@cmth/sim';
import {
  currentStamina,
  expToNext,
  playerExpToNext,
  staminaNextInMs,
  STAMINA_MAX,
  STAMINA_PER_BATTLE,
  type PlayerProgress,
} from '../state/progress';
import { areaName, buildPlayerTeam } from '../state/roster';
import { heroStats, SECT_ULT } from '../state/heroInfo';
import { Modal } from './Modal';
import { HubMap } from './HubMap';

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

function mmss(ms: number): string {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Features not yet built (Phase 2) — opening them shows a "coming soon" modal. */
const SOON_TITLES: Record<string, string> = {
  shop: 'Cửa Hàng',
  gacha: 'Triệu Hồi',
  bag: 'Túi Đồ',
  daily: 'Nhiệm Vụ Hằng Ngày',
  rank: 'Bảng Xếp Hạng',
  mail: 'Thư',
  event: 'Sự Kiện',
  forge: 'Lò Rèn (Thợ Rèn)',
  inn: 'Quán Trọ',
  altar: 'Tế Đàn',
  training: 'Diễn Võ Đường',
  merchant: 'Thương Nhân',
  library: 'Tàng Kinh Các',
};

interface Props {
  progress: PlayerProgress;
  onBattle: () => void;
  onReset: () => void;
}

export function HomeScreen({ progress, onBattle, onReset }: Props) {
  const [now, setNow] = useState(() => Date.now());
  const [open, setOpen] = useState<string | null>(null);
  const [hero, setHero] = useState<string | null>(null);

  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const stamina = currentStamina(progress, now);
  const nextMs = staminaNextInMs(progress, now);
  const canFight = stamina >= STAMINA_PER_BATTLE;
  const team = buildPlayerTeam(progress);
  const playerPct = Math.min(100, (progress.playerExp / playerExpToNext(progress.playerLevel)) * 100);
  const lead = team[0];
  const leadColor = lead ? hex(SECTS[CHARACTERS[lead.defId]!.sect].color) : '#888';
  const battleLabel = `${areaName(progress.stage)} · Màn ${progress.stage}`;

  // The "Khiêu Chiến" gate starts a battle; everything else opens a panel.
  const handleInteract = (id: string) => {
    if (id === 'battle') {
      if (canFight) onBattle();
      else setOpen('area');
      return;
    }
    setOpen(id);
  };

  return (
    <div className="relative h-[100svh] w-full overflow-hidden">
      <HubMap leadColor={leadColor} battleLabel={battleLabel} onInteract={handleInteract} />

      {/* Top-left: Chưởng Môn badge */}
      <div className="absolute left-3 top-3 flex items-center gap-2 rounded-2xl border border-white/10 bg-panel/90 px-3 py-2 backdrop-blur">
        <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-b from-gold to-[#d99b27] text-xl text-[#2a1c00]">掌</div>
        <div>
          <div className="text-sm font-extrabold leading-tight">Lv {progress.playerLevel}</div>
          <div className="mt-1 h-1.5 w-24 overflow-hidden rounded bg-black/40">
            <div className="h-full bg-gradient-to-r from-gold to-[#ffe08a]" style={{ width: `${playerPct}%` }} />
          </div>
        </div>
      </div>

      {/* Top-right: resources */}
      <div className="absolute right-3 top-3 flex gap-2">
        <Pill>💰 <b>{progress.gold}</b></Pill>
        <Pill dim title="Mở ở Phase 2">💎 <b>0</b></Pill>
        <Pill>⚡ <b>{stamina}</b><span className="text-muted">/{STAMINA_MAX}</span>
          <span className="ml-1 text-[11px] text-muted">{nextMs > 0 ? mmss(nextMs) : 'đầy'}</span>
        </Pill>
      </div>

      {/* Right edge: top-level functions */}
      <div className="absolute right-3 top-20 flex flex-col gap-2">
        <Edge emoji="📜" label="Nhiệm vụ" locked onClick={() => setOpen('daily')} />
        <Edge emoji="🏆" label="Xếp hạng" locked onClick={() => setOpen('rank')} />
        <Edge emoji="🎁" label="Sự kiện" locked onClick={() => setOpen('event')} />
        <Edge emoji="✉️" label="Thư" locked onClick={() => setOpen('mail')} />
      </div>

      {/* Left edge: hero/team functions */}
      <div className="absolute left-3 top-24 flex flex-col gap-2">
        <Edge emoji="👥" label="Đội hình" onClick={() => setOpen('team')} />
        <Edge emoji="🎴" label="Tướng" onClick={() => setOpen('heroes')} />
        <Edge emoji="🗺️" label="Khu vực" onClick={() => setOpen('area')} />
        <Edge emoji="⚙️" label="Cài đặt" onClick={() => setOpen('settings')} />
      </div>

      {/* Bottom-right: shop cluster */}
      <div className="absolute bottom-4 right-3 flex items-end gap-2">
        <Edge emoji="🎒" label="Túi đồ" locked onClick={() => setOpen('bag')} />
        <Edge emoji="🎰" label="Triệu hồi" locked onClick={() => setOpen('gacha')} />
        <Edge emoji="🏪" label="Cửa hàng" big locked onClick={() => setOpen('shop')} />
      </div>

      {/* ---------- Modals ---------- */}
      {open === 'team' && (
        <Modal title="Đội hình" onClose={() => setOpen(null)}>
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 6 }).map((_, i) => {
              const r = team[i];
              if (!r)
                return (
                  <div key={i} className="grid min-h-24 place-items-center rounded-xl border-2 border-dashed border-white/15 text-2xl text-white/30">+</div>
                );
              const def = CHARACTERS[r.defId]!;
              return (
                <button key={i} onClick={() => setHero(r.defId)} className="rounded-xl border-2 p-2 text-center hover:bg-white/5" style={{ borderColor: hex(SECTS[def.sect].color) }}>
                  <div className="mb-1.5 h-10 w-full rounded-lg" style={{ background: hex(SECTS[def.sect].color) }} />
                  <div className="truncate text-xs font-bold">{def.name}</div>
                  <div className="text-xs text-muted">Lv {r.level}</div>
                </button>
              );
            })}
          </div>
          <p className="mt-3 text-xs text-muted">Chọn đội hình thủ công sẽ mở khi có hơn 6 tướng (Phase 2).</p>
        </Modal>
      )}

      {open === 'heroes' && (
        <Modal title={`Tướng đang có (${Object.keys(progress.chars).length})`} onClose={() => setOpen(null)}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Object.entries(progress.chars).map(([id, cp]) => {
              const def = CHARACTERS[id]!;
              return (
                <button key={id} onClick={() => setHero(id)} className="rounded-xl border-2 p-3 text-center hover:bg-white/5" style={{ borderColor: hex(SECTS[def.sect].color) }}>
                  <div className="mb-2 h-12 w-full rounded-lg" style={{ background: hex(SECTS[def.sect].color) }} />
                  <div className="truncate text-sm font-bold">{def.name}</div>
                  <div className="truncate text-xs text-muted">{SECTS[def.sect].name}</div>
                  <div className="mt-1 text-xs">Cấp {cp.level}</div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-black/40">
                    <div className="h-full bg-accent" style={{ width: `${Math.min(100, (cp.exp / expToNext(cp.level)) * 100)}%` }} />
                  </div>
                </button>
              );
            })}
          </div>
        </Modal>
      )}

      {open === 'area' && (
        <Modal title="Khu vực đánh quái" onClose={() => setOpen(null)}>
          <div className="flex flex-col gap-2">
            {Array.from({ length: 6 }).map((_, k) => {
              const s = Math.max(1, progress.stage - 1) + k;
              const st = s < progress.stage ? 'done' : s === progress.stage ? 'current' : 'locked';
              return (
                <div key={s} className={`flex items-center justify-between rounded-xl border px-4 py-3 ${st === 'current' ? 'border-gold bg-gold/10' : 'border-white/10 bg-black/20'} ${st === 'locked' ? 'opacity-50' : ''}`}>
                  <div>
                    <div className="font-bold">Màn {s}</div>
                    <div className="text-xs text-muted">{areaName(s)}</div>
                  </div>
                  {st === 'done' && <span className="text-green-400">✓ Đã qua</span>}
                  {st === 'current' && (
                    <button onClick={onBattle} disabled={!canFight} className="rounded-xl bg-gradient-to-b from-gold to-[#d99b27] px-4 py-2 font-bold text-[#2a1c00] disabled:opacity-60 disabled:grayscale">
                      Đánh −{STAMINA_PER_BATTLE}⚡
                    </button>
                  )}
                  {st === 'locked' && <span className="text-muted">🔒</span>}
                </div>
              );
            })}
          </div>
        </Modal>
      )}

      {open === 'settings' && (
        <Modal title="Cài đặt" onClose={() => setOpen(null)}>
          <button onClick={onReset} className="w-full rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 font-bold text-red-300 hover:bg-red-500/20">
            Chơi lại từ đầu (xoá tiến trình)
          </button>
          <p className="mt-3 text-xs text-muted">Tiến trình lưu cục bộ trên trình duyệt (Phase 1).</p>
        </Modal>
      )}

      {open !== null && SOON_TITLES[open] && (
        <Modal title={SOON_TITLES[open]!} onClose={() => setOpen(null)}>
          <div className="py-8 text-center text-muted">
            <div className="mb-2 text-4xl">🚧</div>
            Tính năng <b className="text-gold">{SOON_TITLES[open]}</b> sẽ ra mắt ở <b className="text-gold">Phase 2</b>.
          </div>
        </Modal>
      )}

      {hero && (
        <HeroDetail defId={hero} level={progress.chars[hero]?.level ?? 1} exp={progress.chars[hero]?.exp ?? 0} onClose={() => setHero(null)} />
      )}
    </div>
  );
}

function Pill({ children, dim, title }: { children: ReactNode; dim?: boolean; title?: string }) {
  return (
    <span title={title} className={`flex items-center gap-1 rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm backdrop-blur ${dim ? 'opacity-60' : ''}`}>
      {children}
    </span>
  );
}

function Edge({ emoji, label, onClick, locked, big }: { emoji: string; label: string; onClick: () => void; locked?: boolean; big?: boolean }) {
  return (
    <button onClick={onClick} className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl border border-white/10 bg-panel/90 backdrop-blur hover:bg-white/10"
      style={{ width: big ? 64 : 52, height: big ? 64 : 52 }}>
      <span className={big ? 'text-3xl' : 'text-xl'}>{emoji}</span>
      <span className="text-[9px] leading-none text-muted">{label}</span>
      {locked && <span className="absolute -right-1 -top-1 rounded bg-black/70 px-1 text-[9px] text-gold">P2</span>}
    </button>
  );
}

function HeroDetail({ defId, level, exp, onClose }: { defId: string; level: number; exp: number; onClose: () => void }) {
  const def = CHARACTERS[defId]!;
  const sect = SECTS[def.sect];
  const s = heroStats(defId, level);
  const ult = SECT_ULT[def.sect];
  const Stat = ({ label, value }: { label: string; value: number }) => (
    <div className="rounded-lg bg-black/30 px-3 py-2">
      <div className="text-xs text-muted">{label}</div>
      <div className="font-bold">{value}</div>
    </div>
  );
  return (
    <Modal title={def.name} onClose={onClose}>
      <div className="flex items-center gap-3">
        <div className="h-16 w-16 rounded-xl" style={{ background: hex(sect.color) }} />
        <div>
          <div className="text-sm" style={{ color: hex(sect.color) }}>{sect.name} · {sect.role}</div>
          <div className="font-bold">Cấp {level}</div>
          <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-xs">{s.ranged ? '🏹 Tầm xa' : '🗡️ Cận chiến'}</span>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        <Stat label="HP" value={s.hp} />
        <Stat label="Công" value={s.atk} />
        <Stat label="Thủ" value={s.def} />
        <Stat label="Tốc" value={s.spd} />
      </div>
      <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="text-xs uppercase tracking-wider text-muted">Chiêu cuối</div>
        <div className="font-bold text-gold">{ult.name}</div>
        <div className="mt-1 text-sm text-white/80">{ult.desc}</div>
      </div>
      <div className="mt-3 text-xs text-muted">EXP: {exp}/{expToNext(level)}</div>
    </Modal>
  );
}
