import { useLayoutEffect, useRef } from 'react';
import type { RefObject } from 'react';

export function OverwriteConfirmation({ pending, onCancel, onConfirm, opener, damaged = false }: {
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  opener: RefObject<HTMLButtonElement | null>;
  damaged?: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const modal = dialog.current;
    if (!modal) return;
    modal.showModal();
    cancel.current?.focus();
    return () => {
      modal.close();
      opener.current?.focus();
    };
  }, [opener]);

  return (
    <dialog
      className="overwrite-dialog"
      ref={dialog}
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="overwrite-heading"
      aria-describedby="overwrite-description"
      onCancel={(event) => {
        event.preventDefault();
        if (!pending) onCancel();
      }}
      onKeyDown={(event) => {
        if (event.key !== 'Tab' || pending) return;
        const buttons = event.currentTarget.querySelectorAll('button');
        const [first, last] = buttons;
        if (event.target === (event.shiftKey ? first : last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
    >
      <h2 id="overwrite-heading">
        <span className="overwrite-dialog__warning" aria-hidden="true">!</span> {damaged ? 'Replace damaged save?' : 'New Game?'}
      </h2>
      <p id="overwrite-description">{damaged
        ? 'Starting a new run will replace this damaged save.'
        : 'This will overwrite your current save progress. Continue?'}</p>
      <div className="overwrite-dialog__actions">
        <button className="menu-button" type="button" ref={cancel} onClick={onCancel} disabled={pending}>Cancel</button>
        <button className="menu-button menu-button--rust" type="button" onClick={onConfirm} disabled={pending}>
          {damaged ? 'Replace damaged save' : 'New Game'}
        </button>
      </div>
      {pending && <p className="menu-help" role="status">Starting the run…</p>}
    </dialog>
  );
}
