import { useEffect, useRef, useState } from 'react';
import { createGameCoordinator, restoreGameCoordinator } from '../game/gameCoordinator';
import type { GameCoordinator, SurvivorId } from '../game/gameCoordinator';
import { SaveFailure } from './SaveRepository';
import type { SaveRepository } from './SaveRepository';
import { captureRun } from './runSnapshot';
import type { DamagedSaveGuard, SavedRun, SaveRead } from './runSnapshot';

type Availability = SaveRead['kind'] | 'checking' | 'blocked' | 'read_failed' | 'unavailable';
type MenuDestination = 'main' | 'survivors';
type OwnedSlot = { owner: string; revision: number };
type RunSession = OwnedSlot & { id: string; coordinator: GameCoordinator };
type Replacement = OwnedSlot & { characterId: SurvivorId };
type DamagedReplacement = { owner: string; guard: DamagedSaveGuard; stage: 'confirm' | 'choose' };
export type DeathSaveStatus = 'pending' | 'failed' | 'conflict' | 'read_failed' | 'verified' | 'complete';
type PauseFeedback = { kind: 'saved' | 'error' | 'progress'; message: string };
type SaveAttempt = { exit: boolean; revision: number; run: SavedRun };
type PauseRecovery =
  | { kind: 'reload' }
  | { kind: 'retry_write'; attempt: SaveAttempt }
  | { kind: 'retry_read'; attempt?: SaveAttempt };

const blockedMessage = 'This run is open in another tab.';
const storageMessage = 'Couldn’t access the local save. Try again.';
const revisionMessage = 'Your progress wasn’t saved because the local save changed.';

function availabilityMessage(status: Availability, unsupportedReason?: 'newer_schema' | 'world') {
  switch (status) {
    case 'checking': return 'Checking the local save…';
    case 'blocked': return blockedMessage;
    case 'unsupported': return unsupportedReason === 'newer_schema'
      ? 'This save uses a newer save format. Open it with a compatible version of Dead County.'
      : 'This save uses a different neighborhood version. Open it with a compatible version of Dead County.';
    case 'damaged': return 'The local save is damaged.';
    case 'read_failed': return 'Could not read the local save.';
    case 'unavailable': return 'Local run ownership is unavailable in this browser.';
    case 'empty':
    case 'dead': return 'No run available to continue';
    case 'ready': return '';
  }
}

function failureKind(error: unknown) {
  return error instanceof SaveFailure ? error.kind : 'storage';
}

export function useRunFlow(repository: SaveRepository) {
  const [session, setSession] = useState<RunSession | null>(null);
  const [destination, setDestination] = useState<MenuDestination>('main');
  const [availability, setAvailability] = useState<{ status: Availability; message: string }>({
    status: 'checking', message: availabilityMessage('checking'),
  });
  const [pending, setPending] = useState(false);
  const [menuError, setMenuError] = useState<string | null>(null);
  const [replacement, setReplacement] = useState<Replacement | null>(null);
  const [damagedReplacement, setDamagedReplacement] = useState<DamagedReplacement | null>(null);
  const [pauseFeedback, setPauseFeedback] = useState<PauseFeedback | null>(null);
  const [pauseRecovery, setPauseRecovery] = useState<PauseRecovery | null>(null);
  const [deathStatus, setDeathStatus] = useState<DeathSaveStatus>('pending');

  const operation = useRef(false);
  const currentRun = useRef<RunSession | null>(null);
  const pendingReplacement = useRef<Replacement | null>(null);
  const pendingDamage = useRef<DamagedReplacement | null>(null);
  const deathWrite = useRef<Promise<boolean> | null>(null);
  const deathCommitted = useRef(false);

  function displayAvailability(status: Availability, reason?: 'newer_schema' | 'world') {
    const message = availabilityMessage(status, reason);
    setAvailability((previous) => previous.status === status && previous.message === message
      ? previous : { status, message });
  }

  async function checkAvailability() {
    if (await repository.isOccupied()) return { status: 'blocked' } as const;
    const result = await repository.read();
    return { status: result.kind, reason: result.kind === 'unsupported' ? result.reason : undefined };
  }

  useEffect(() => {
    if (session || pending || replacement || damagedReplacement || availability.status === 'read_failed') return;
    let current = true;
    let checking = false;
    async function refresh() {
      if (checking || operation.current || currentRun.current || pendingReplacement.current || pendingDamage.current) return;
      checking = true;
      try {
        const { status, reason } = await checkAvailability();
        if (current && !operation.current) displayAvailability(status, reason);
      } catch (error) {
        if (current && !operation.current) {
          displayAvailability(failureKind(error) === 'unavailable' ? 'unavailable' : 'read_failed');
        }
      } finally {
        checking = false;
      }
    }
    // Refresh on authoritative lock queries even if an owning tab crashes without notifying us.
    const interval = window.setInterval(refresh, 1000);
    const unsubscribe = repository.subscribeAvailability(refresh);
    window.addEventListener('focus', refresh);
    if (availability.status !== 'blocked') void refresh();
    return () => {
      current = false;
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      unsubscribe();
    };
  }, [repository, session, pending, replacement, damagedReplacement, availability.status]);

  function beginMenuCommand() {
    if (operation.current || currentRun.current) return false;
    operation.current = true;
    setPending(true);
    setMenuError(null);
    return true;
  }

  function finishMenuCommand() {
    operation.current = false;
    setPending(false);
  }

  function enterRun(slot: RunSession) {
    currentRun.current = slot;
    deathWrite.current = null;
    deathCommitted.current = false;
    setDeathStatus('pending');
    setPauseFeedback(null);
    setPauseRecovery(null);
    setSession(slot);
  }

  function leaveRun(next: MenuDestination) {
    currentRun.current = null;
    displayAvailability('checking');
    setDestination(next);
    setSession(null);
  }

  async function makeNewRun(slot: OwnedSlot, characterId: SurvivorId) {
    const coordinator = createGameCoordinator({ characterId });
    const id = crypto.randomUUID();
    const revision = await repository.commit(slot.owner, slot.revision, {
      kind: 'create', run: { id, snapshot: captureRun(coordinator) },
    });
    enterRun({ owner: slot.owner, revision, id, coordinator });
  }

  async function withAcquiredSlot(action?: (owner: string, save: SaveRead) => Promise<void>) {
    if (pendingReplacement.current || pendingDamage.current || !beginMenuCommand()) return;
    let owner: string | null = null;
    let blocked = false;
    try {
      owner = await repository.tryAcquire();
      if (owner === null) {
        blocked = true;
        return;
      }
      const saved = await repository.read(owner);
      displayAvailability(saved.kind, saved.kind === 'unsupported' ? saved.reason : undefined);
      await action?.(owner, saved);
    } catch (error) {
      const kind = failureKind(error);
      if (kind === 'ownership') blocked = true;
      else if (kind === 'unavailable') displayAvailability('unavailable');
      else if (kind === 'read') displayAvailability('read_failed');
      else setMenuError(kind === 'conflict' ? revisionMessage : storageMessage);
    } finally {
      if (owner && !currentRun.current && !pendingReplacement.current && !pendingDamage.current) {
        await repository.release(owner);
      }
      if (blocked) displayAvailability('blocked');
      finishMenuCommand();
    }
  }

  async function requestStart(characterId: SurvivorId) {
    if (pendingDamage.current?.stage === 'choose') {
      await startDamagedReplacement(pendingDamage.current, characterId);
      return;
    }
    await withAcquiredSlot(async (owner, saved) => {
      if (saved.kind === 'ready') {
        const confirmation = { owner, revision: saved.revision, characterId };
        pendingReplacement.current = confirmation;
        setReplacement(confirmation);
      } else if (saved.kind === 'dead' || saved.kind === 'empty') {
        await makeNewRun({ owner, revision: saved.revision }, characterId);
      }
    });
  }

  async function retryMenuRead() {
    if (availability.status === 'read_failed') await withAcquiredSlot();
  }

  function setDamage(choice: DamagedReplacement | null) {
    pendingDamage.current = choice;
    setDamagedReplacement(choice);
  }

  async function requestDamagedReplacement() {
    if (availability.status !== 'damaged') return;
    await withAcquiredSlot(async (owner, saved) => {
      if (saved.kind === 'damaged' && saved.guard) setDamage({ owner, guard: saved.guard, stage: 'confirm' });
    });
  }

  async function decideDamagedReplacement(confirm: boolean) {
    const choice = pendingDamage.current;
    if (!choice || operation.current) return;
    if (confirm && choice.stage === 'confirm') {
      setDamage({ ...choice, stage: 'choose' });
    } else if (!confirm && beginMenuCommand()) {
      try {
        await repository.release(choice.owner);
      } finally {
        setDamage(null);
        finishMenuCommand();
      }
    }
  }

  async function startDamagedReplacement(choice: DamagedReplacement, characterId: SurvivorId) {
    if (!beginMenuCommand()) return;
    let lost = false;
    try {
      const coordinator = createGameCoordinator({ characterId });
      const id = crypto.randomUUID();
      const revision = await repository.replaceDamaged(choice.owner, choice.guard, { id, snapshot: captureRun(coordinator) });
      enterRun({ owner: choice.owner, revision, id, coordinator });
    } catch (error) {
      const kind = failureKind(error);
      lost = kind === 'ownership';
      if (!lost) {
        setMenuError(kind === 'conflict'
          ? 'The local save changed. Review it before replacing it.'
          : 'Could not replace the damaged save. The existing record was preserved.');
      }
    } finally {
      if (!currentRun.current) await repository.release(choice.owner);
      if (lost) displayAvailability('blocked');
      setDamage(null);
      finishMenuCommand();
    }
  }

  async function continueRun() {
    await withAcquiredSlot(async (owner, saved) => {
      if (saved.kind !== 'ready') return;
      enterRun({
        owner, revision: saved.revision, id: saved.run.id,
        coordinator: restoreGameCoordinator(saved.run.snapshot),
      });
    });
  }

  async function finishReplacement(confirm: boolean) {
    const choice = pendingReplacement.current;
    if (!choice || !beginMenuCommand()) return;
    try {
      if (confirm) await makeNewRun(choice, choice.characterId);
    } catch (error) {
      const kind = failureKind(error);
      if (kind === 'ownership') displayAvailability('blocked');
      else setMenuError(kind === 'conflict' ? revisionMessage : storageMessage);
    } finally {
      if (!currentRun.current) await repository.release(choice.owner);
      pendingReplacement.current = null;
      setReplacement(null);
      finishMenuCommand();
    }
  }

  async function loseRunOwnership(active: RunSession) {
    await repository.release(active.owner);
    leaveRun('main');
    displayAvailability('blocked');
  }

  function offerReload() {
    setPauseFeedback({ kind: 'error', message: revisionMessage });
    setPauseRecovery({ kind: 'reload' });
  }

  async function checkRetry(active: RunSession, attempt: SaveAttempt) {
    try {
      const saved = await repository.read(active.owner);
      if (saved.kind === 'ready' && saved.revision === attempt.revision && saved.run.id === attempt.run.id) {
        setPauseFeedback({ kind: 'error', message: 'Could not save.' });
        setPauseRecovery({ kind: 'retry_write', attempt });
      } else {
        offerReload();
      }
    } catch (error) {
      if (failureKind(error) === 'ownership') await loseRunOwnership(active);
      else {
        setPauseFeedback({ kind: 'error', message: 'Could not read the local save.' });
        setPauseRecovery({ kind: 'retry_read', attempt });
      }
    }
  }

  async function writeSave(active: RunSession, attempt: SaveAttempt) {
    operation.current = true;
    setPauseFeedback(null);
    setPauseRecovery(null);
    active.coordinator.setSavePending(true);
    try {
      active.revision = await repository.commit(active.owner, attempt.revision, { kind: 'save', run: attempt.run });
      if (attempt.exit) {
        await repository.release(active.owner);
        leaveRun('main');
      } else {
        setPauseFeedback({ kind: 'saved', message: 'Game saved' });
        active.coordinator.setSavePending(false);
      }
    } catch (error) {
      const kind = failureKind(error);
      if (kind === 'ownership') await loseRunOwnership(active);
      else if (kind === 'conflict' || kind === 'invalid') offerReload();
      else await checkRetry(active, attempt);
    } finally {
      operation.current = false;
    }
  }

  async function save(exit: boolean) {
    const active = currentRun.current;
    if (!active || operation.current || active.coordinator.getState().gameOver) return;
    const { foregroundPanel, tabHidden, savePending } = active.coordinator.getPauseState();
    if (foregroundPanel !== 'pause' || tabHidden || savePending) return;
    await writeSave(active, {
      exit, revision: active.revision,
      run: { id: active.id, snapshot: captureRun(active.coordinator) },
    });
  }

  async function recoverPause() {
    const active = currentRun.current;
    const choice = pauseRecovery;
    if (!active || !choice || operation.current || active.coordinator.getPauseState().tabHidden) return;
    if (choice.kind === 'retry_write') {
      await writeSave(active, choice.attempt);
      return;
    }

    operation.current = true;
    setPauseRecovery(null);
    setPauseFeedback({ kind: 'progress', message: 'Reading the local save…' });
    try {
      if (choice.kind === 'retry_read' && choice.attempt) {
        await checkRetry(active, choice.attempt);
        return;
      }
      const saved = await repository.read(active.owner);
      if (saved.kind === 'ready') {
        const coordinator = restoreGameCoordinator(saved.run.snapshot);
        const { tabHidden, resumeRequired } = active.coordinator.getPauseState();
        coordinator.handleEscape();
        if (tabHidden || resumeRequired) {
          coordinator.setTabHidden(true);
          coordinator.setTabHidden(tabHidden);
        }
        enterRun({ owner: active.owner, revision: saved.revision, id: saved.run.id, coordinator });
      } else {
        await repository.release(active.owner);
        leaveRun('main');
        displayAvailability(saved.kind, saved.kind === 'unsupported' ? saved.reason : undefined);
      }
    } catch (error) {
      if (failureKind(error) === 'ownership') await loseRunOwnership(active);
      else {
        setPauseFeedback({ kind: 'error', message: 'Could not read the local save.' });
        setPauseRecovery({ kind: 'retry_read' });
      }
    } finally {
      operation.current = false;
    }
  }

  function invalidateDeath(active: RunSession) {
    if (deathCommitted.current) return Promise.resolve(true);
    if (deathWrite.current) return deathWrite.current;
    setDeathStatus('pending');
    deathWrite.current = (async () => {
      try {
        active.revision = await repository.commit(active.owner, active.revision, { kind: 'invalidate', runId: active.id });
        deathCommitted.current = true;
        setDeathStatus('complete');
        return true;
      } catch (error) {
        const kind = failureKind(error);
        if (kind === 'ownership') {
          await loseRunOwnership(active);
          return false;
        }
        // Keep the lease and the terminal run in view until invalidation commits.
        setDeathStatus(kind === 'conflict' || kind === 'invalid' ? 'conflict' : 'failed');
        return false;
      } finally {
        deathWrite.current = null;
      }
    })();
    return deathWrite.current;
  }

  useEffect(() => {
    if (!session) return;
    let observed = false;
    let foreground = session.coordinator.getPauseState().foregroundPanel;
    const observeSession = () => {
      const next = session.coordinator.getPauseState().foregroundPanel;
      if (foreground === 'pause' && next !== foreground) setPauseFeedback(null);
      foreground = next;
      if (observed || !session.coordinator.getState().gameOver) return;
      observed = true;
      void invalidateDeath(session);
    };
    const unsubscribe = session.coordinator.subscribe(observeSession);
    observeSession();
    return unsubscribe;
  }, [session]);

  async function leaveDeadRun(next: MenuDestination) {
    const active = currentRun.current;
    if (!active?.coordinator.getState().gameOver || operation.current
        || deathStatus === 'conflict' || deathStatus === 'read_failed') return;
    operation.current = true;
    try {
      if (!await invalidateDeath(active)) return;
      await repository.release(active.owner);
      leaveRun(next);
    } finally {
      operation.current = false;
    }
  }

  async function recoverDeadSave() {
    const active = currentRun.current;
    if (!active?.coordinator.getState().gameOver || operation.current
        || (deathStatus !== 'conflict' && deathStatus !== 'read_failed')) return;
    operation.current = true;
    setDeathStatus('pending');
    try {
      const saved = await repository.read(active.owner);
      if (saved.kind === 'ready' && saved.run.id === active.id) {
        // A separate, explicit Game Over action may now close this same run.
        active.revision = saved.revision;
        setDeathStatus('verified');
      } else {
        await repository.release(active.owner);
        leaveRun('main');
        displayAvailability(saved.kind, saved.kind === 'unsupported' ? saved.reason : undefined);
      }
    } catch (error) {
      if (failureKind(error) === 'ownership') await loseRunOwnership(active);
      else setDeathStatus('read_failed');
    } finally {
      operation.current = false;
    }
  }

  return {
    session, destination, availability, pending, menuError, replacement, damagedReplacement, pauseFeedback, deathStatus,
    requestStart, continueRun, finishReplacement, save, leaveDeadRun, recoverPause, recoverDeadSave,
    retryMenuRead, requestDamagedReplacement, decideDamagedReplacement,
    pauseRecovery: pauseRecovery && {
      label: pauseRecovery.kind === 'reload' ? 'Reload latest save'
        : pauseRecovery.kind === 'retry_read' ? 'Try reading again' : 'Try again',
      warning: pauseRecovery.kind === 'reload' ? 'Reloading will discard unsaved progress in this tab.' : undefined,
    },
    clearMenuError: () => setMenuError(null),
  };
}
