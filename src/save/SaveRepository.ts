import type { DamagedSaveGuard, SavedRun, SaveRead } from './runSnapshot.ts';

export type SaveFailureKind = 'ownership' | 'conflict' | 'storage' | 'read' | 'unavailable' | 'invalid';

export class SaveFailure extends Error {
  constructor(readonly kind: SaveFailureKind) {
    super(kind);
    this.name = 'SaveFailure';
  }
}

export type SaveMutation =
  | { kind: 'create' | 'save'; run: SavedRun }
  | { kind: 'invalidate'; runId: string };

export interface SaveRepository {
  isOccupied(): Promise<boolean>;
  subscribeAvailability(listener: () => void): () => void;
  tryAcquire(): Promise<string | null>;
  release(owner: string): Promise<void>;
  read(owner?: string): Promise<SaveRead>;
  commit(owner: string, expectedRevision: number, mutation: SaveMutation): Promise<number>;
  replaceDamaged(owner: string, guard: DamagedSaveGuard, run: SavedRun): Promise<number>;
}
