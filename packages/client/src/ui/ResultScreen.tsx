import type { Rewards } from '../state/progress';

interface Props {
  win: boolean;
  rewards: Rewards;
  onContinue: () => void;
}

export function ResultScreen({ win, rewards, onContinue }: Props) {
  return (
    <div className="screen result">
      <h2 className={win ? 'win-text' : 'lose-text'}>{win ? 'Chiến Thắng!' : 'Thất Bại'}</h2>
      <div className="rewards">
        <p>💰 Vàng <b>+{rewards.gold}</b></p>
        <p>✨ Kinh nghiệm <b>+{rewards.exp}</b> mỗi nhân vật</p>
        {rewards.levelUps.length > 0 && (
          <p className="levelup">⬆️ Lên cấp: {rewards.levelUps.join(', ')}</p>
        )}
      </div>
      <button className="primary" onClick={onContinue}>
        Tiếp tục
      </button>
    </div>
  );
}
