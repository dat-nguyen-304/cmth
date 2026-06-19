import type { Rewards } from '../state/progress';

interface Props {
  win: boolean;
  rewards: Rewards;
  onContinue: () => void;
}

export function ResultScreen({ win, rewards, onContinue }: Props) {
  return (
    <div className="grid min-h-[100svh] place-items-center p-4">
      <div className="animate-pop-in w-full max-w-sm overflow-hidden rounded-3xl border border-white/10 bg-panel shadow-[0_20px_60px_#000a]">
        {/* Banner */}
        <div
          className={`relative overflow-hidden px-6 pb-6 pt-8 text-center ${
            win ? 'bg-gradient-to-b from-[#4a3a0e] to-transparent' : 'bg-gradient-to-b from-[#3a1414] to-transparent'
          }`}
        >
          <div
            className={`mx-auto mb-3 grid h-20 w-20 place-items-center rounded-full text-5xl shadow-lg ${
              win ? 'bg-gradient-to-b from-gold to-[#d99b27]' : 'bg-gradient-to-b from-[#5a2230] to-[#3a1620]'
            }`}
          >
            {win ? '🏆' : '🥀'}
          </div>
          <h2
            className={`text-4xl font-black tracking-wide ${win ? 'text-gold' : 'text-red-300'}`}
            style={win ? { textShadow: '0 0 18px rgba(242,193,78,0.5)' } : undefined}
          >
            {win ? 'CHIẾN THẮNG' : 'THẤT BẠI'}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {win ? 'Vượt màn thành công — màn kế đã mở!' : 'Chỉnh lại đội hình rồi tái chiến nhé.'}
          </p>
        </div>

        {/* Rewards */}
        <div className="px-5 pb-6">
          <div className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Phần thưởng</div>
          <div className="grid grid-cols-3 gap-2">
            <RewardCard icon="💰" label="Vàng" value={rewards.gold} />
            <RewardCard icon="🔮" label="Tinh Hoa" value={rewards.essence} />
            <RewardCard icon="掌" label="Chưởng Môn" value={rewards.playerExp} />
          </div>

          {/* Chưởng Môn level-up callout */}
          {rewards.playerLeveledTo !== null && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-gold/40 bg-gold/10 px-3 py-2 text-sm font-bold text-gold">
              <span className="text-lg">⬆️</span>
              Chưởng Môn đạt cấp {rewards.playerLeveledTo}!
            </div>
          )}

          <button
            onClick={onContinue}
            className="mt-5 w-full rounded-2xl bg-gradient-to-b from-gold to-[#d99b27] py-3.5 text-lg font-extrabold text-[#2a1c00] shadow-[0_4px_0_#0004] transition active:translate-y-0.5"
          >
            Về sảnh
          </button>
        </div>
      </div>
    </div>
  );
}

function RewardCard({ icon, label, value }: { icon: string; label: string; value: number }) {
  return (
    <div className="rounded-xl border border-white/5 bg-black/25 px-2 py-3 text-center">
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-lg font-black text-gold">+{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}
