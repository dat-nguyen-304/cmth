import { useState } from 'react';
import type { Side } from '@cmth/sim';
import { HomeScreen } from './ui/HomeScreen';
import { BattleScreen } from './ui/BattleScreen';
import { ResultScreen } from './ui/ResultScreen';
import {
  applyRewards,
  loadProgress,
  resetProgress,
  saveProgress,
  type PlayerProgress,
  type Rewards,
} from './state/progress';
import { battleSeed, buildEnemyTeam, buildPlayerTeam } from './state/roster';
import type { Recruit } from '@cmth/sim';

type Screen = 'home' | 'battle' | 'result';

interface BattleSetup {
  player: Recruit[];
  enemy: Recruit[];
  seed: number;
}

export function App() {
  const [progress, setProgress] = useState<PlayerProgress>(loadProgress);
  const [screen, setScreen] = useState<Screen>('home');
  const [setup, setSetup] = useState<BattleSetup | null>(null);
  const [result, setResult] = useState<{ win: boolean; rewards: Rewards } | null>(null);

  function startBattle() {
    setSetup({
      player: buildPlayerTeam(progress),
      enemy: buildEnemyTeam(progress.stage),
      seed: battleSeed(progress.stage),
    });
    setScreen('battle');
  }

  function finishBattle(winner: Side | null) {
    const win = winner === 0;
    const { next, rewards } = applyRewards(progress, win);
    setProgress(next);
    saveProgress(next);
    setResult({ win, rewards });
    setScreen('result');
  }

  function reset() {
    setProgress(resetProgress());
    setScreen('home');
  }

  if (screen === 'battle' && setup) {
    return (
      <BattleScreen
        playerTeam={setup.player}
        enemyTeam={setup.enemy}
        seed={setup.seed}
        onFinish={finishBattle}
      />
    );
  }

  if (screen === 'result' && result) {
    return (
      <ResultScreen win={result.win} rewards={result.rewards} onContinue={() => setScreen('home')} />
    );
  }

  return <HomeScreen progress={progress} onBattle={startBattle} onReset={reset} />;
}
