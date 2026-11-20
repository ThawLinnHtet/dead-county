import { useLayoutEffect, useRef } from 'react';
import type { GameOverResult } from '../game/gameCoordinator';
import { formatSurvivalTime } from './formatSurvivalTime';
import './run-menus.css';
import './game-over.css';

export function GameOverScreen({ result, onNewRun, onMainMenu }: {
  result: GameOverResult;
  onNewRun: () => void;
  onMainMenu: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const isLeaving = useRef(false);
  const { finalActiveTimeMs } = result;
  const seconds = Number.isFinite(finalActiveTimeMs) ? Math.floor(Math.max(0, finalActiveTimeMs) / 1000) : 0;

  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

  function leave(action: () => void) {
    if (isLeaving.current) return;
    isLeaving.current = true;
    action();
  }

  return (
    <main className="run-menu game-over" aria-labelledby="game-over-heading">
      <p className="menu-wordmark game-over-brand"><span>Dead County</span></p>
      <h1 className="menu-wordmark game-over-heading" id="game-over-heading" ref={heading} tabIndex={-1}>
        <span>Game Over</span>
      </h1>
      <p className="game-over-message">You didn’t survive.</p>
      <dl className="game-over-result">
        <dt><span className="game-over-clock-icon" aria-hidden="true" />Survival Time</dt>
        <dd><time dateTime={`PT${seconds}S`}>{formatSurvivalTime(seconds)}</time></dd>
      </dl>
      <div className="game-over-actions">
        <button type="button" className="menu-button menu-button--olive" onClick={() => leave(onNewRun)}>
          <span className="game-over-play-icon" aria-hidden="true" />New Run
        </button>
        <button type="button" className="menu-button" onClick={() => leave(onMainMenu)}>
          <span className="game-over-home-icon" aria-hidden="true" />Main Menu
        </button>
      </div>
    </main>
  );
}
