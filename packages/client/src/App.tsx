import { useEffect, useState } from 'react';
import type { Recruit, Side } from '@cmth/sim';
import { HomeScreen } from './ui/HomeScreen';
import { BattleScreen } from './ui/BattleScreen';
import { ResultScreen } from './ui/ResultScreen';
import {
  applyRewards,
  currentStamina,
  loadProgress,
  resetProgress,
  saveProgress,
  spendStamina,
  STAMINA_PER_BATTLE,
  type PlayerProgress,
  type Rewards,
} from './state/progress';
import { battleSeed, buildEnemyTeam, buildPlayerTeam } from './state/roster';

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

  // Persist whenever progress changes.
  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  function startBattle() {
    const now = Date.now();
    if (currentStamina(progress, now) < STAMINA_PER_BATTLE) return; // also guarded in UI
    const spent = spendStamina(progress, now, STAMINA_PER_BATTLE);
    setProgress(spent);
    setSetup({
      player: buildPlayerTeam(spent),
      enemy: buildEnemyTeam(spent.stage),
      seed: battleSeed(spent.stage),
    });
    setScreen('battle');
  }

  function finishBattle(winner: Side | null) {
    const win = winner === 0;
    const { next, rewards } = applyRewards(progress, win);
    setProgress(next);
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
