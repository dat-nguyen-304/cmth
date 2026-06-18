import { CHARACTERS, SECTS } from '@cmth/sim';
import { expToNext, type PlayerProgress } from '../state/progress';

function hex(color: number): string {
  return '#' + color.toString(16).padStart(6, '0');
}

interface Props {
  progress: PlayerProgress;
  onBattle: () => void;
  onReset: () => void;
}

export function HomeScreen({ progress, onBattle, onReset }: Props) {
  return (
    <div className="screen home">
      <h1>Chưởng Môn Tí Hon</h1>
      <p className="subtitle">Bản web — Nguyên mẫu Giai đoạn 1</p>

      <div className="topbar">
        <span>💰 Vàng: <b>{progress.gold}</b></span>
        <span>🏯 Màn: <b>{progress.stage}</b></span>
      </div>

      <div className="roster">
        {Object.entries(progress.chars).map(([id, cp]) => {
          const def = CHARACTERS[id]!;
          const color = SECTS[def.sect].color;
          return (
            <div className="card" key={id} style={{ borderColor: hex(color) }}>
              <div className="card-swatch" style={{ background: hex(color) }} />
              <div className="card-name">{def.name}</div>
              <div className="card-sect">{SECTS[def.sect].name}</div>
              <div className="card-level">Cấp {cp.level}</div>
              <div className="xpbar">
                <div
                  className="xpfill"
                  style={{ width: `${Math.min(100, (cp.exp / expToNext(cp.level)) * 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="actions">
        <button className="primary" onClick={onBattle}>
          ⚔️ Vào trận — Màn {progress.stage}
        </button>
        <button className="ghost" onClick={onReset}>
          Chơi lại từ đầu
        </button>
      </div>
    </div>
  );
}
