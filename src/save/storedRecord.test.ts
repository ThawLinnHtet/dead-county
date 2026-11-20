import assert from 'node:assert/strict';
import test from 'node:test';
import { sameStoredRecord } from './storedRecord.ts';
import { inspectSaveRecord, saveSchemaVersion, slotKey } from './runSnapshot.ts';

test('a revisionless guard compares the whole structured record and its shared references', () => {
  const shared = new Uint8Array([1, 2, 3]);
  const first = {
    revision: 'unreadable',
    extra: new Map([['bytes', shared]]),
    tags: new Set(['old', 'unknown']),
    alternate: shared,
    date: new Date(0),
  };
  const copy = structuredClone(first);
  assert.equal(sameStoredRecord(first, copy), true);
  copy.alternate[1] = 7;
  assert.equal(sameStoredRecord(first, copy), false);

  const differentAlias = structuredClone(first);
  differentAlias.alternate = new Uint8Array([1, 2, 3]);
  assert.equal(sameStoredRecord(first, differentAlias), false);
});

test('guards compare cycles, sparse arrays and exact numeric values, and reject opaque content', () => {
  const first: { self?: unknown; fields: unknown[] } = { fields: [, -0, NaN] };
  first.self = first;
  const copy = structuredClone(first);
  assert.equal(sameStoredRecord(first, copy), true);
  copy.fields[0] = undefined;
  assert.equal(sameStoredRecord(first, copy), false);
  assert.equal(sameStoredRecord([-0], [0]), false);
  assert.equal(sameStoredRecord({ blob: new Blob(['bytes']) }, { blob: new Blob(['bytes']) }), undefined);
});

test('a newer schema is identified before malformed or unknown gameplay fields', () => {
  const record = { key: slotKey, schemaVersion: saveSchemaVersion + 1, revision: 'other format', run: new Map() };
  assert.deepEqual(inspectSaveRecord(record), { kind: 'unsupported', reason: 'newer_schema' });
});
