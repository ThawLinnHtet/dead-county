import type { GameState } from '../game/gameCoordinator.ts';

export const checkpointIntervalMs = 30_000;

export function checkpointDue(state: GameState, saved: GameState): boolean {
  if (state === saved || state.gameOver) return false;
  return (!state.sleep && state.activeTimeMs - saved.activeTimeMs >= checkpointIntervalMs)
    || state.containers !== saved.containers
    || state.packs !== saved.packs
    || state.droppedItems !== saved.droppedItems
    || state.survivor.inventory !== saved.survivor.inventory
    || state.survivor.equippedWeaponId !== saved.survivor.equippedWeaponId
    || state.survivor.equippedPackId !== saved.survivor.equippedPackId
    || state.safehouse !== saved.safehouse
    || Boolean(state.sleep) !== Boolean(saved.sleep);
}
