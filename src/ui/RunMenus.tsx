import { useEffect, useRef, useState } from 'react';
import { version } from '../../package.json';
import type { SurvivorId } from '../game/gameCoordinator';
import { OverwriteConfirmation } from './OverwriteConfirmation';
import './run-menus.css';

const survivors = [
  { id: 'survivor_male', label: 'Male Survivor', portrait: 'survivor-male.webp' },
  { id: 'survivor_female', label: 'Female Survivor', portrait: 'survivor-female.webp' },
] as const;

const controls = [
  { keys: ['W', 'A', 'S', 'D'], action: 'Move on screen. Combine keys to move diagonally.' },
  { keys: ['Shift'], action: 'Hold with movement to sprint. After exhaustion, release and press again once Stamina recovers.' },
  { keys: ['Mouse'], action: 'Face and aim toward the cursor in the game world.' },
  { keys: ['Left Click'], action: 'Swing the baseball bat when equipped and ready.' },
  { keys: ['E'], action: 'Search the indicated container or pick up the indicated dropped item.' },
  { keys: ['I'], action: 'Open Inventory.' },
  { keys: ['M', 'Minimap click'], action: 'Open the full neighborhood map.' },
  { keys: ['Esc'], action: 'Pause or close the current overlay.' },
];

type MenuScreen = 'main' | 'controls' | 'survivors';

function Wordmark({ main = false }: { main?: boolean }) {
  const Title = main ? 'h1' : 'p';

  return (
    <div className="menu-brand">
      <Title className="menu-wordmark" aria-label="Dead County">
        <span aria-hidden="true">Dead<br />County</span>
      </Title>
      <p className="menu-tagline">Isometric Zombie Survival</p>
    </div>
  );
}

export function RunMenus({
  initialScreen, canStart, canContinue, statusMessage, errorMessage, pending, replacementOpen,
  onStartRun, onContinue, onConfirmReplacement, onCancelReplacement, onNavigate,
}: {
  initialScreen: 'main' | 'survivors';
  canStart: boolean;
  canContinue: boolean;
  statusMessage: string;
  errorMessage: string | null;
  pending: boolean;
  replacementOpen: boolean;
  onStartRun: (characterId: SurvivorId) => void;
  onContinue: () => void;
  onConfirmReplacement: () => void;
  onCancelReplacement: () => void;
  onNavigate: () => void;
}) {
  const [screen, setScreen] = useState<MenuScreen>(initialScreen);
  const [selected, setSelected] = useState<SurvivorId | null>(null);
  const newGame = useRef<HTMLButtonElement>(null);
  const showControls = useRef<HTMLButtonElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const startButton = useRef<HTMLButtonElement>(null);
  const opener = useRef<Exclude<MenuScreen, 'main'> | null>(initialScreen === 'survivors' ? 'survivors' : null);

  function open(next: Exclude<MenuScreen, 'main'>) {
    opener.current = next;
    setSelected(null);
    onNavigate();
    setScreen(next);
  }

  useEffect(() => {
    if (screen === 'main') {
      if (opener.current === 'survivors') newGame.current?.focus();
      if (opener.current === 'controls') showControls.current?.focus();
      return;
    }

    heading.current?.focus();
  }, [screen]);

  function backToMenu() {
    onNavigate();
    setScreen('main');
  }

  function startRun() {
    if (selected && canStart && !pending) onStartRun(selected);
  }

  return (
    <main
      className={screen === 'main' ? 'run-menu run-menu--main' : 'run-menu run-menu--detail'}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && screen !== 'main' && !pending && !replacementOpen) backToMenu();
      }}
    >
      <Wordmark main={screen === 'main'} />
      {screen === 'main' && (
        <>
          <nav className="run-menu-nav" aria-label="Main Menu">
            <button className="menu-button menu-button--olive" ref={newGame} disabled={pending || !canStart} onClick={() => open('survivors')}>New Game</button>
            <div>
              <button
                className="menu-button"
                disabled={pending || !canContinue}
                aria-describedby="continue-status"
                onClick={onContinue}
              >Continue</button>
              <p id="continue-status" className="menu-help" role="status">{pending ? 'Opening the local save…' : statusMessage}</p>
              {errorMessage && <p className="menu-error" role="alert">{errorMessage}</p>}
            </div>
            <button className="menu-button" ref={showControls} disabled={pending} onClick={() => open('controls')}>Controls</button>
          </nav>
          <p className="menu-version">v{version}</p>
        </>
      )}
      {screen === 'survivors' && (
        <section className="survivor-selection" aria-labelledby="survivor-heading">
          <h1 ref={heading} tabIndex={-1} id="survivor-heading" className="menu-heading">Select Your Survivor</h1>
          <p className="survivor-subtitle">Choose one survivor to start your journey.</p>
          <div className="survivor-cards" role="group" aria-label="Survivor choices">
            {survivors.map(({ id, label, portrait }) => (
              <button
                type="button"
                className="survivor-card"
                key={id}
                aria-pressed={selected === id}
                disabled={pending}
                onClick={() => setSelected(id)}
              >
                {selected === id && <span className="survivor-check" aria-hidden="true" />}
                <img src={import.meta.env.BASE_URL + 'assets/ui/' + portrait} alt="" />
                <span className="survivor-label">{label}</span>
              </button>
            ))}
          </div>
          <div className="survivor-actions">
            <button className="menu-button" disabled={pending} onClick={backToMenu}>Back</button>
            <button
              className="menu-button menu-button--rust"
              ref={startButton}
              disabled={!selected || !canStart || (pending && !replacementOpen)}
              onClick={startRun}
            >Start Run</button>
          </div>
          {!replacementOpen && pending && <p className="menu-help" role="status">Starting the run…</p>}
          {!replacementOpen && !pending && !canStart && <p className="menu-help" role="status">{statusMessage}</p>}
          {errorMessage && <p className="menu-error" role="alert">{errorMessage}</p>}
          {replacementOpen && (
            <OverwriteConfirmation
              pending={pending}
              onCancel={onCancelReplacement}
              onConfirm={onConfirmReplacement}
              opener={startButton}
            />
          )}
        </section>
      )}
      {screen === 'controls' && (
        <section className="menu-controls" aria-labelledby="controls-heading">
          <h1 ref={heading} tabIndex={-1} id="controls-heading" className="menu-heading">Controls</h1>
          <dl className="control-list">
            {controls.map(({ keys, action }) => (
              <div key={keys[0]} className="control-row">
                <dt>{keys.map((key) => <kbd key={key}>{key}</kbd>)}</dt>
                <dd>{action}</dd>
              </div>
            ))}
          </dl>
          <button className="menu-button" onClick={backToMenu}>Back</button>
        </section>
      )}
    </main>
  );
}
