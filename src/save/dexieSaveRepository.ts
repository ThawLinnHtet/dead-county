import Dexie from 'dexie';
import type { Table } from 'dexie';
import { inspectSaveRecord, isRevision, readRevision, saveRecord, slotKey } from './runSnapshot.ts';
import type { DamagedSaveGuard, SavedRun } from './runSnapshot.ts';
import { SaveFailure } from './SaveRepository.ts';
import type { SaveRepository } from './SaveRepository.ts';
import { sameStoredRecord } from './storedRecord.ts';

const databaseName = 'dead-county';
const lockName = 'dead-county:local-run';
const ownershipChannel = 'dead-county:run-availability';

interface OwnerRecord {
  key: typeof slotKey;
  token: string;
}

interface RunLease {
  readonly token: string;
  readonly unlock: () => void;
  readonly finished: Promise<unknown>;
}

export function createDexieSaveRepository(): SaveRepository {
  const database = new Dexie(databaseName) as Dexie & {
    ownership: Table<OwnerRecord, string>;
    saves: Table<unknown, string>;
  };
  database.version(1).stores({ ownership: 'key', saves: 'key' });
  let active: RunLease | null = null;
  const listeners = new Set<() => void>();
  const diagnosedRecords = new WeakMap<DamagedSaveGuard, { owner: string; record: unknown }>();
  const channel = typeof BroadcastChannel === 'function' ? new BroadcastChannel(ownershipChannel) : null;

  function notify() {
    for (const listener of listeners) listener();
  }
  channel?.addEventListener('message', notify);

  function announce() {
    channel?.postMessage('changed');
    notify();
  }

  function requireLocks() {
    if (!navigator.locks) throw new SaveFailure('unavailable');
    return navigator.locks;
  }

  async function verifyOwner(owner: string) {
    if (active?.token !== owner || (await database.ownership.get(slotKey))?.token !== owner
      || active?.token !== owner) throw new SaveFailure('ownership');
  }

  async function writeOwned(owner: string, write: (record: unknown) => Promise<number>) {
    try {
      return await database.transaction('rw', [database.ownership, database.saves], async () => {
        await verifyOwner(owner);
        return write(await database.saves.get(slotKey));
      });
    } catch (error) {
      if (error instanceof SaveFailure) throw error;
      throw new SaveFailure('storage');
    }
  }

  async function store(revision: number, run: SavedRun | null) {
    if (!isRevision(revision)) throw new SaveFailure('invalid');
    const next = saveRecord(revision, run);
    if (run && inspectSaveRecord(next).kind !== 'ready') throw new SaveFailure('invalid');
    await database.saves.put(next);
    return revision;
  }

  const repository: SaveRepository = {
    async isOccupied() {
      const { held } = await requireLocks().query();
      return held?.some((lock) => lock.name === lockName) ?? false;
    },
    subscribeAvailability(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    async tryAcquire() {
      const locks = requireLocks();
      return new Promise<string | null>((resolve, reject) => {
        const finished = locks.request(lockName, { ifAvailable: true }, async (lock) => {
          if (!lock) {
            resolve(null);
            return;
          }
          const token = crypto.randomUUID();
          let unlock!: () => void;
          const released = new Promise<void>((done) => { unlock = done; });
          await database.ownership.put({ key: slotKey, token });
          active = { token, unlock, finished };
          resolve(token);
          announce();
          await released;
        });
        void finished.catch(() => reject(new SaveFailure('storage')));
      });
    },
    async release(owner) {
      if (active?.token !== owner) return;
      const lease = active;
      active = null;
      try {
        await database.transaction('rw', database.ownership, async () => {
          if ((await database.ownership.get(slotKey))?.token === owner) {
            await database.ownership.delete(slotKey);
          }
        });
      } catch {
        // The browser lock is authoritative. Its successor always installs a fresh token.
      } finally {
        lease.unlock();
        await lease.finished;
        announce();
      }
    },
    async read(owner) {
      try {
        const record = owner === undefined
          ? await database.saves.get(slotKey)
          : await database.transaction('r', [database.ownership, database.saves], async () => {
            await verifyOwner(owner);
            return database.saves.get(slotKey);
          });
        const diagnosis = inspectSaveRecord(record);
        if (!owner || diagnosis.kind !== 'damaged') return diagnosis;

        // Keep the IndexedDB read's detached record private until the confirmation is used.
        const guard = Object.freeze({ revision: readRevision(record) });
        diagnosedRecords.set(guard, { owner, record });
        return { kind: 'damaged', guard };
      } catch (error) {
        if (error instanceof SaveFailure) throw error;
        throw new SaveFailure('read');
      }
    },
    async commit(owner, expectedRevision, mutation) {
      return writeOwned(owner, async (record) => {
        const revisionBefore = readRevision(record);
        if (revisionBefore === undefined) throw new SaveFailure('invalid');
        if (!isRevision(expectedRevision) || revisionBefore !== expectedRevision) throw new SaveFailure('conflict');
        const current = inspectSaveRecord(record);
        if (current.kind === 'damaged' || current.kind === 'unsupported') throw new SaveFailure('invalid');

        if (mutation.kind !== 'create') {
          const runId = mutation.kind === 'invalidate' ? mutation.runId : mutation.run.id;
          if (current.kind !== 'ready' || current.run.id !== runId) throw new SaveFailure('conflict');
        }
        return store(current.revision + 1, mutation.kind === 'invalidate' ? null : mutation.run);
      });
    },
    async replaceDamaged(owner, guard, run) {
      return writeOwned(owner, async (record) => {
        const diagnosis = diagnosedRecords.get(guard);
        if (!diagnosis || diagnosis.owner !== owner || inspectSaveRecord(record).kind !== 'damaged') {
          throw new SaveFailure('conflict');
        }
        const revision = readRevision(record);
        const unchanged = guard.revision === undefined
          ? revision === undefined && sameStoredRecord(diagnosis.record, record)
          : revision === guard.revision;
        if (unchanged === undefined) throw new SaveFailure('invalid');
        if (!unchanged) throw new SaveFailure('conflict');
        return store((revision ?? 0) + 1, run);
      });
    },
  };
  return repository;
}
