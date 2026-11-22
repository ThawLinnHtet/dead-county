import { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import { HouseScene } from './HouseScene';
import type { GameAudio } from './gameAudio';
import type { GameCoordinator, GameOverResult, InteractionTarget } from './gameCoordinator';
import { itemDefinitions } from './items';

const movementKeys = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ShiftLeft', 'ShiftRight', 'KeyC']);

function renderSize(parent: HTMLElement) {
  const density = Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  return {
    width: Math.max(1, Math.round(parent.clientWidth * density)),
    height: Math.max(1, Math.round(parent.clientHeight * density)),
    zoom: 1 / density,
  };
}

export function GameViewport({ coordinator, audio, onDeathAnimationEnd }: {
  coordinator: GameCoordinator;
  audio: GameAudio;
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
          && (target.closed !== displayed.closed || target.wedged !== displayed.wedged || target.lock !== displayed.lock))
        || (target?.kind === 'container' && displayed?.kind === 'container' && target.empty !== displayed.empty)
        || (target?.kind === 'bed' && displayed?.kind === 'bed' && target.sleeping !== displayed.sleeping);
      const strain = target?.kind === 'opening' ? target.strain : 'intact';
      const previousStrain = displayed?.kind === 'opening' ? displayed.strain : 'intact';
      displayed = target;
      if (changed) feedback.textContent = '';
      prompt.hidden = target === null;
      if (!placement || !target) return;
      if (changed || strain !== previousStrain) {
        label.textContent = target.kind === 'container' ? (target.empty ? 'Store' : 'Search')
          : target.kind === 'bed' ? (target.sleeping ? 'Wake up' : 'Sleep') : target.kind === 'opening'
          ? target.lock === 'locked' ? 'Locked door'
            : target.lock === 'key' ? 'Unlock door'
            : target.lock === 'inside' ? 'Unlatch door'
            : `${target.closed ? 'Open' : 'Close'} ${target.object.type}${target.wedged ? ' (wedged)' : ''}`
          : 'Pick up ' + itemDefinitions[target.item.kind].name;
        warning.textContent = strain === 'failing' ? 'Near failure' : strain === 'straining' ? 'Strained' : '';
        warning.dataset.strain = strain;
        promptInset = prompt.offsetWidth / 2 + 4;
      }
      prompt.style.left = `clamp(${promptInset}px, ${placement.x}px, calc(100% - ${promptInset}px))`;
      prompt.style.top = `${placement.y}px`;
    }, onDeathAnimationEnd, window.matchMedia('(prefers-reduced-motion: reduce)').matches, audio);

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
        const target = displayed;
        const result = coordinator.interact(target);
        if (result.status === 'picked_up') audio.confirm('item');
        if (target.kind === 'opening' && (result.status === 'opening_changed' || result.status === 'opening_locked')) {
          scene.playOpeningFeedback(target, result.status === 'opening_locked');
        }
        if (result.status === 'opening_blocked') {
          feedback.textContent = target.kind === 'opening' && target.object.type === 'door'
            ? 'Doorway blocked' : 'Window blocked';
        } else if (result.status === 'opening_locked') {
          feedback.textContent = 'Cedar Workshop is locked. Check Cedar House for the key, or try the side window.';
        } else if (result.status === 'sleep_blocked') {
          feedback.textContent = result.reason;
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
      if (!movementKeys.has(event.code) || coordinator.getState().sleep) return;
      heldKeys.add(event.code);
      updateMovement();
    }

    function onKeyUp(event: KeyboardEvent) {
      if (heldKeys.delete(event.code)) updateMovement();
    }

    const unsubscribe = coordinator.subscribe(() => {
      if (coordinator.getPauseState().isPaused || coordinator.getState().gameOver || coordinator.getState().sleep) heldKeys.clear();
    });
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearMovement);

    let game: Phaser.Game | undefined;
    let observer: ResizeObserver | undefined;
    function resize() {
      if (!game) return;
      const { width, height, zoom } = renderSize(parent!);
      const { scale } = game;
      if (scale.zoom !== zoom) scale.setZoom(zoom);
      if (scale.gameSize.width !== width || scale.gameSize.height !== height) scale.resize(width, height);
    }
    const frame = requestAnimationFrame(() => {
      game = new Phaser.Game({
        type: Phaser.AUTO,
        parent,
        backgroundColor: '#3f4934',
        pixelArt: true,
        audio: { noAudio: true },
        scene,
        scale: { mode: Phaser.Scale.NONE, ...renderSize(parent) },
        input: { keyboard: false, windowEvents: false },
        callbacks: {
          postBoot({ canvas }) {
            canvas.tabIndex = -1;
            canvas.setAttribute('aria-label', 'Dead County game canvas');
            if (document.activeElement === parent) canvas.focus({ preventScroll: true });
            observer = new ResizeObserver(resize);
            observer.observe(parent);
            window.addEventListener('resize', resize);
          },
        },
      });
    });

    return () => {
      unsubscribe();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearMovement);
      window.removeEventListener('resize', resize);
      observer?.disconnect();
      clearMovement();
      cancelAnimationFrame(frame);
      game?.destroy(true);
    };
  }, [coordinator, audio, onDeathAnimationEnd]);

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
