import { useLayoutEffect, useRef } from 'react';
import type { DeathSaveStatus } from '../save/useRunFlow';
import type { GameOverResult } from '../game/gameCoordinator';
import { formatSurvivalTime } from './formatSurvivalTime';
import './run-menus.css';
import './game-over.css';

export function GameOverScreen({ result, onNewRun, onMainMenu, saveStatus, onRecoverSave }: {
  result: GameOverResult;
  onNewRun: () => void;
  onMainMenu: () => void;
  saveStatus?: DeathSaveStatus;
  onRecoverSave?: () => void;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  const { finalActiveTimeMs } = result;
  const seconds = Number.isFinite(finalActiveTimeMs) ? Math.floor(Math.max(0, finalActiveTimeMs) / 1000) : 0;
  const readRecovery = saveStatus === 'conflict' || saveStatus === 'read_failed';
  const canLeave = saveStatus !== 'pending' && !readRecovery;

  useLayoutEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, []);

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
        <button type="button" className="menu-button menu-button--olive" onClick={onNewRun} disabled={!canLeave}>
          <span className="game-over-play-icon" aria-hidden="true" />New Run
        </button>
        <button type="button" className="menu-button" onClick={onMainMenu} disabled={!canLeave}>
          <span className="game-over-home-icon" aria-hidden="true" />Main Menu
        </button>
        {readRecovery && (
          <button type="button" className="menu-button" onClick={onRecoverSave} aria-describedby="game-over-save-recovery">
            {saveStatus === 'conflict' ? 'Reload latest save' : 'Try reading again'}
          </button>
        )}
      </div>
      {saveStatus === 'pending' && <p className="menu-help" role="status">Closing the run…</p>}
      {saveStatus === 'failed' && (
        <p className="menu-error" role="alert">Couldn’t close this run’s save. Choose an action to try again.</p>
      )}
      {readRecovery && (
        <p className="menu-error" id="game-over-save-recovery" role="alert">
          {saveStatus === 'conflict' ? 'Your progress wasn’t saved because the local save changed.' : 'Could not read the local save.'}
        </p>
      )}
      {saveStatus === 'verified' && (
        <p className="menu-help" role="status">This save belongs to the ended run. Choose an action to close it.</p>
      )}
    </main>
  );
}
