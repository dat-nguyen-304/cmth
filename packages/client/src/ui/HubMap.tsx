import { useEffect, useRef, useState, type MouseEvent } from 'react';

/**
 * The central town scene — a side-scrolling map wider than the screen. Click anywhere
 * to walk the avatar there (point-to-move); the camera follows it left/right. Movement
 * is clamped to a narrow vertical band so it stays mostly horizontal.
 *
 * Interaction requires PROXIMITY: clicking a far NPC just walks toward it; you can only
 * open an NPC once the avatar is close (via the floating prompt or clicking it then).
 * The "Khiêu Chiến" gate is itself a map location that starts a battle.
 *
 * Visuals are placeholder (blocks/emoji); real art/animation come later.
 */

interface Npc {
  id: string;
  emoji: string;
  label: string;
  x: number; // world px
  y: number; // % down the map
}

const WORLD_W = 2600; // map is wider than the viewport → camera scrolls
const NEAR_PX = 95; // how close (horizontally) to interact
const BOUND = { minX: 60, maxX: WORLD_W - 60, minY: 66, maxY: 88 };

const NPCS: Npc[] = [
  { id: 'forge', emoji: '🔨', label: 'Thợ Rèn', x: 300, y: 72 },
  { id: 'inn', emoji: '🏮', label: 'Quán Trọ', x: 620, y: 70 },
  { id: 'altar', emoji: '⛩️', label: 'Tế Đàn', x: 960, y: 68 },
  { id: 'training', emoji: '🥋', label: 'Diễn Võ Đường', x: 1320, y: 72 },
  { id: 'merchant', emoji: '🧧', label: 'Thương Nhân', x: 1700, y: 70 },
  { id: 'library', emoji: '📜', label: 'Tàng Kinh Các', x: 2040, y: 70 },
  { id: 'battle', emoji: '🐲', label: 'Khiêu Chiến', x: 2420, y: 70 },
];

function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}

// Persist the avatar across mounts so returning from a battle leaves you where you
// were standing (e.g. by the battle gate) instead of teleporting to the map start.
let savedPos = { x: 240, y: 82 };
let savedFacing: 1 | -1 = 1;

export function HubMap({
  leadColor,
  battleLabel,
  onInteract,
}: {
  leadColor: string;
  battleLabel: string;
  onInteract: (id: string) => void;
}) {
  const outerRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const avatarRef = useRef<HTMLDivElement>(null);
  const pos = useRef({ ...savedPos });
  const target = useRef<{ x: number; y: number } | null>(null);
  const facing = useRef<1 | -1>(savedFacing);
  const camera = useRef(0);
  const nearRef = useRef<Npc | null>(null);
  const [near, setNear] = useState<Npc | null>(null);
  const [marker, setMarker] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(50, t - last) / 1000;
      last = t;

      const tgt = target.current;
      if (tgt) {
        let { x, y } = pos.current;
        const dx = tgt.x - x;
        const dy = tgt.y - y;
        const sx = 340 * dt; // px/s horizontal
        const sy = 22 * dt; // %/s vertical (slow → limited up/down)
        if (Math.abs(dx) <= sx) x = tgt.x;
        else {
          x += Math.sign(dx) * sx;
          facing.current = dx > 0 ? 1 : -1;
        }
        if (Math.abs(dy) <= sy) y = tgt.y;
        else y += Math.sign(dy) * sy;
        pos.current = { x, y };
        if (x === tgt.x && y === tgt.y) {
          target.current = null;
          setMarker(null);
        }
      }

      // Remember where we are so a remount (after battle) restores this spot.
      savedPos = { x: pos.current.x, y: pos.current.y };
      savedFacing = facing.current;

      // Camera follows the avatar, clamped to world bounds.
      const vw = outerRef.current?.clientWidth ?? 0;
      const cam = clamp(pos.current.x - vw / 2, 0, Math.max(0, WORLD_W - vw));
      camera.current = cam;
      if (worldRef.current) worldRef.current.style.transform = `translateX(${-cam}px)`;

      const el = avatarRef.current;
      if (el) {
        el.style.left = `${pos.current.x}px`;
        el.style.top = `${pos.current.y}%`;
        el.style.transform = `translate(-50%, -100%) scaleX(${facing.current})`;
      }

      // Proximity is horizontal-only (it's a side-scroller, band is narrow).
      let n: Npc | null = null;
      for (const npc of NPCS) {
        if (Math.abs(npc.x - pos.current.x) < NEAR_PX) {
          n = npc;
          break;
        }
      }
      if (n?.id !== nearRef.current?.id) {
        nearRef.current = n;
        setNear(n);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const moveTo = (e: MouseEvent<HTMLDivElement>) => {
    const rect = outerRef.current!.getBoundingClientRect();
    const worldX = clamp(e.clientX - rect.left + camera.current, BOUND.minX, BOUND.maxX);
    const y = clamp(((e.clientY - rect.top) / rect.height) * 100, BOUND.minY, BOUND.maxY);
    target.current = { x: worldX, y };
    setMarker({ x: worldX, y });
  };

  return (
    <div
      ref={outerRef}
      onClick={moveTo}
      className="absolute inset-0 cursor-pointer overflow-hidden bg-gradient-to-b from-[#27314d] via-[#202a40] to-[#161b27]"
    >
      <div ref={worldRef} className="absolute left-0 top-0 h-full will-change-transform" style={{ width: WORLD_W }}>
        {/* distant silhouettes */}
        <div className="pointer-events-none absolute bottom-[28%] left-0 right-0 flex items-end justify-around opacity-25">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="w-16 rounded-t-2xl bg-[#0c1018]" style={{ height: 60 + ((i * 37) % 70) }} />
          ))}
        </div>
        {/* ground */}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-[40%] bg-gradient-to-b from-[#3a3322] to-[#241f15]" />
        <div className="pointer-events-none absolute bottom-[36%] left-0 right-0 h-px bg-white/10" />

        {/* NPCs */}
        {NPCS.map((npc) => {
          const active = near?.id === npc.id;
          const isBattle = npc.id === 'battle';
          const label = isBattle ? battleLabel : npc.label;
          const box = isBattle ? 'clamp(64px,4.8vw,96px)' : 'clamp(56px,4vw,83px)';
          return (
            <button
              key={npc.id}
              onClick={(e) => {
                // Only interact when close; otherwise let the click bubble → walk toward it.
                if (nearRef.current?.id === npc.id) {
                  e.stopPropagation();
                  onInteract(npc.id);
                }
              }}
              className="absolute flex -translate-x-1/2 -translate-y-full flex-col items-center"
              style={{ left: `${npc.x}px`, top: `${npc.y}%` }}
            >
              <span
                className={`mb-1 whitespace-nowrap rounded-full bg-black/50 px-2 ${active ? 'text-gold' : 'text-white/70'}`}
                style={{ fontSize: 'clamp(11px,0.72vw,14px)' }}
              >
                {label}
              </span>
              <span
                className={`grid place-items-center rounded-2xl border-2 bg-panel transition ${
                  active ? 'border-gold shadow-[0_0_16px] shadow-gold' : isBattle ? 'border-gold/60' : 'border-white/15'
                }`}
                style={{ width: box, height: box, fontSize: isBattle ? 'clamp(36px,2.7vw,54px)' : 'clamp(30px,2.4vw,48px)' }}
              >
                {npc.emoji}
              </span>
            </button>
          );
        })}

        {/* Click-to-move marker */}
        {marker && (
          <div
            className="pointer-events-none absolute h-6 w-6 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-gold"
            style={{ left: `${marker.x}px`, top: `${marker.y}%` }}
          />
        )}

        {/* Avatar */}
        <div ref={avatarRef} className="pointer-events-none absolute z-10" style={{ left: savedPos.x, top: `${savedPos.y}%`, transform: `translate(-50%,-100%) scaleX(${savedFacing})` }}>
          <div className="rounded-md border-2 border-white/30 shadow-lg" style={{ background: leadColor, width: 'clamp(36px,2.4vw,48px)', height: 'clamp(48px,3.2vw,64px)' }} />
          <div className="mx-auto mt-0.5 h-1.5 rounded-full bg-black/40 blur-[1px]" style={{ width: 'clamp(28px,1.8vw,37px)' }} />
        </div>
      </div>

      {/* Interaction prompt (screen-fixed, only when near) */}
      {near && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onInteract(near.id);
          }}
          className="absolute left-1/2 top-[50%] -translate-x-1/2 animate-bounce rounded-full bg-gold px-4 py-1.5 font-bold text-[#2a1c00] shadow-lg"
          style={{ fontSize: 'clamp(14px,0.96vw,18px)' }}
        >
          {near.id === 'battle' ? '⚔️ Bấm để Đánh quái' : `Bấm để vào ${near.label}`}
        </button>
      )}

      {/* Hint */}
      <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-black/40 px-3 py-1 text-xs text-white/60">
        Bấm vào map để di chuyển · đi tới NPC để tương tác
      </div>
    </div>
  );
}
