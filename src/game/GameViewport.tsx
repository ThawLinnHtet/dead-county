import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { HouseScene } from './HouseScene';
import type { GameCoordinator, GameOverResult, InteractionTarget } from './gameCoordinator';
import { itemDefinitions } from './items';

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyC']);

export function GameViewport({ coordinator, onDeathAnimationEnd }: {
  coordinator: GameCoordinator;
  onDeathAnimationEnd: (result: GameOverResult) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const interactionPrompt = useRef<HTMLDivElement>(null);
  const interactionLabel = useRef<HTMLSpanElement>(null);
  const interactionWarning = useRef<HTMLSpanElement>(null);
  const pickupFeedback = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const parent = host.current;
    const prompt = interactionPrompt.current;
    const label = interactionLabel.current;
    const warning = interactionWarning.current;
    const feedback = pickupFeedback.current;
    if (!parent || !prompt || !label || !warning || !feedback) return;

    const heldKeys = new Set<string>();
    let displayed: InteractionTarget | null = null;
    let promptInset = 0;
    const scene = new HouseScene(coordinator, (placement) => {
      const target = placement?.target ?? null;
      const changed = target?.id !== displayed?.id || target?.kind !== displayed?.kind
        || (target?.kind === 'opening' && displayed?.kind === 'opening'
          && (target.closed !== displayed.closed || target.wedged !== displayed.wedged));
      const strain = target?.kind === 'opening' ? target.strain : 'intact';
      const previousStrain = displayed?.kind === 'opening' ? displayed.strain : 'intact';
      displayed = target;
      if (changed) feedback.textContent = '';
      prompt.hidden = target === null;
      if (!placement || !target) return;
      if (changed || strain !== previousStrain) {
        label.textContent = target.kind === 'container' ? 'Search' : target.kind === 'opening'
          ? `${target.closed ? 'Open' : 'Close'} ${target.object.type}${target.wedged ? ' (wedged)' : ''}`
          : 'Pick up ' + itemDefinitions[target.item.kind].name;
        warning.textContent = strain === 'failing' ? 'Near failure' : strain === 'straining' ? 'Strained' : '';
        warning.dataset.strain = strain;
        promptInset = prompt.offsetWidth / 2 + 4;
      }
      prompt.style.left = `clamp(${promptInset}px, ${placement.x}px, calc(100% - ${promptInset}px))`;
      prompt.style.top = `${placement.y}px`;
    }, onDeathAnimationEnd, window.matchMedia('(prefers-reduced-motion: reduce)').matches);

    function updateMovement() {
      coordinator.setMovement({
        x: Number(heldKeys.has('KeyD')) - Number(heldKeys.has('KeyA')),
        y: Number(heldKeys.has('KeyS')) - Number(heldKeys.has('KeyW')),
      }, heldKeys.has('ShiftLeft') || heldKeys.has('ShiftRight'), heldKeys.has('KeyC'));
    }

    function clearMovement() {
      heldKeys.clear();
      coordinator.setReady(false);
      updateMovement();
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey
        || event.target instanceof HTMLButtonElement || coordinator.getPauseState().isPaused
        || coordinator.getState().gameOver) return;
      if (event.code === 'Space') {
        coordinator.startShove();
        event.preventDefault();
        return;
      }
      if (event.code === 'KeyE' && displayed) {
        const result = coordinator.interact(displayed);
        if (result.status === 'opening_blocked') {
          feedback.textContent = displayed.kind === 'opening' && displayed.object.type === 'door'
            ? 'Doorway blocked' : 'Window blocked';
        } else if (result.status === 'inventory_full') {
          feedback.textContent = 'Inventory full';
        } else if (result.status === 'too_heavy') {
          feedback.textContent = 'Too heavy to carry';
        } else {
          displayed = null;
          prompt.hidden = true;
          feedback.textContent = '';
        }
        event.preventDefault();
        return;
      }
      if (!movementKeys.has(event.code)) return;
      heldKeys.add(event.code);
      updateMovement();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (heldKeys.delete(event.code)) updateMovement();
    }

    const unsubscribe = coordinator.subscribe(() => {
      if (coordinator.getPauseState().isPaused || coordinator.getState().gameOver) heldKeys.clear();
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearMovement);

    let game: Phaser.Game | undefined;
    const frame = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#3f4934',
        pixelArt: true,
        scene,
        scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
        input: { keyboard: false, windowEvents: false },
        callbacks: {
          postBoot({ canvas }) {
            canvas.tabIndex = -1;
            canvas.setAttribute('aria-label', 'Dead County game canvas');
            if (document.activeElement === parent) canvas.focus({ preventScroll: true });
          },
        },
      });
    });

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearMovement);
      clearMovement();
      cancelAnimationFrame(frame);
      game?.destroy(true);
    };
  }, [coordinator, onDeathAnimationEnd]);

  return (
    <div ref={host} className="game-viewport" role="region" aria-label="Dead County game world" tabIndex={-1}>
      <div ref={interactionPrompt} className="world-interaction-prompt" hidden>
        <kbd>E</kbd> <span ref={interactionLabel} />
        <span ref={interactionWarning} className="world-opening-warning" role="status" />
      </div>
      <p ref={pickupFeedback} className="world-pickup-feedback" role="status" />
    </div>
  );
}
