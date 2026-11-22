import { useLayoutEffect, useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import type { PauseState } from './gamePause';
import './pauseMenu.css';

export interface PauseSaveActions {
  readonly saveGame: () => void;
  readonly saveAndExit: () => void;
  readonly feedback?: { kind: 'saved' | 'error' | 'progress'; message: string } | null;
  readonly recovery?: { label: string; warning?: string; activate: () => void } | null;
}

export function PauseMenu({
  pause,
  onResume,
  saveActions,
  soundToggle,
}: {
  pause: PauseState;
  onResume: () => void;
  saveActions?: PauseSaveActions;
  soundToggle: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const resume = useRef<HTMLButtonElement>(null);
  const recoveryButton = useRef<HTMLButtonElement>(null);
  const canSave = saveActions && !pause.savePending && !pause.tabHidden;
  const recovery = saveActions?.recovery;

  useLayoutEffect(() => {
    const menu = dialog.current;
    if (!menu) return;
    menu.showModal();
    resume.current?.focus();
    return () => menu.close();
  }, []);

  useLayoutEffect(() => {
    if (pause.tabHidden) return;
    if (recovery?.label) recoveryButton.current?.focus();
    else if (!pause.savePending) resume.current?.focus();
  }, [recovery?.label, pause.savePending, pause.tabHidden]);

  function trapFocus(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const buttons = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('button:not(:disabled):not([aria-disabled="true"])')];
    const first = buttons[0];
    const last = buttons.at(-1);
    const edge = event.shiftKey ? first : last;
    if (event.target === edge || !buttons.includes(event.target as HTMLButtonElement)) {
      event.preventDefault();
      (event.shiftKey ? last : first)?.focus();
    }
  }

  return (
    <dialog
      ref={dialog}
      className="pause-menu"
      aria-label="Pause Menu"
      onCancel={(event) => event.preventDefault()}
      onKeyDown={trapFocus}
    >
      <h2 className="pause-menu__title">Dead County</h2>
      <div className="pause-menu__actions">
        <button
          ref={resume}
          type="button"
          className="pause-menu__action pause-menu__action--resume"
          aria-disabled={pause.savePending || pause.tabHidden}
          onClick={onResume}
        >
          <span className="pause-menu__icon pause-menu__icon--play" aria-hidden="true" />
          Resume
        </button>
        <button
          type="button"
          className="pause-menu__action"
          aria-disabled={!canSave}
          onClick={canSave ? saveActions.saveGame : undefined}
        >
          <span className="pause-menu__icon pause-menu__icon--save" aria-hidden="true" />
          Save Game
        </button>
        <button
          type="button"
          className="pause-menu__action"
          aria-disabled={!canSave}
          onClick={canSave ? saveActions.saveAndExit : undefined}
        >
          <span className="pause-menu__icon pause-menu__icon--exit" aria-hidden="true" />
          Save &amp; Exit
        </button>
      </div>
      {saveActions?.feedback
        ? <p className="pause-menu__status" role={saveActions.feedback.kind === 'error' ? 'alert' : 'status'}>
            {saveActions.feedback.message}
          </p>
        : pause.savePending && <p className="pause-menu__status" role="status">Saving…</p>}
      {recovery && (
        <div className="pause-menu__recovery">
          {recovery.warning && <p className="pause-menu__status" id="save-reload-warning">{recovery.warning}</p>}
          <button
            ref={recoveryButton}
            className="pause-menu__action"
            type="button"
            disabled={pause.tabHidden}
            aria-describedby={recovery.warning ? 'save-reload-warning' : undefined}
            onClick={recovery.activate}
          >
            {recovery.label}
          </button>
        </div>
      )}
      <div className="pause-menu__sound">{soundToggle}</div>
    </dialog>
  );
}
