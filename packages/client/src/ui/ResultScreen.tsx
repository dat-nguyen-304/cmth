import type { Rewards } from '../state/progress';

interface Props {
  win: boolean;
  rewards: Rewards;
  onContinue: () => void;
}

export function ResultScreen({ win, rewards, onContinue }: Props) {
  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-panel p-8 text-center">
      <h2 className={`mb-4 text-4xl font-black ${win ? 'text-green-400' : 'text-red-400'}`}>
        {win ? 'Chiến Thắng!' : 'Thất Bại'}
      </h2>
      <div className="space-y-2 text-[17px]">
        <p>💰 Vàng <b>+{rewards.gold}</b></p>
        <p>✨ Kinh nghiệm <b>+{rewards.exp}</b> mỗi nhân vật</p>
        <p>掌 Chưởng Môn EXP <b>+{rewards.playerExp}</b></p>
        {rewards.playerLeveledTo !== null && (
          <p className="font-bold text-gold">⬆️ Chưởng Môn lên cấp {rewards.playerLeveledTo}!</p>
        )}
        {rewards.levelUps.length > 0 && (
          <p className="font-bold text-gold">⬆️ Tướng lên cấp: {rewards.levelUps.join(', ')}</p>
        )}
      </div>
      <button
        onClick={onContinue}
        className="mt-5 rounded-xl bg-gradient-to-b from-gold to-[#d99b27] px-7 py-3.5 text-lg font-extrabold text-[#2a1c00] shadow-[0_4px_0_#0004] active:translate-y-0.5"
      >
        Tiếp tục
      </button>
    </div>
  );
}
