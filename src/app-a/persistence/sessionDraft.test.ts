import assert from 'node:assert/strict';
import { DRAFT_PREFIX, clearSessionDrafts, readSessionDraft, writeSessionDraft } from './sessionDraft';
import { secondsUntil } from '../components/focus/focusClock';

const values: Record<string, string> = {};
const storage = Object.assign(values, {});
Object.defineProperties(storage, {
  getItem: { value: (key: string) => values[key] ?? null },
  setItem: { value: (key: string, value: string) => { values[key] = value; } },
  removeItem: { value: (key: string) => { delete values[key]; } },
});
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: storage });
const valid = (value: unknown) => typeof value === 'string';
writeSessionDraft('u:today:date', 'unfinished thoughts');
assert.equal(readSessionDraft('u:today:date', '', valid), 'unfinished thoughts');
assert.equal(readSessionDraft('other:today:date', '', valid), '');
values[DRAFT_PREFIX + 'bad'] = '{invalid';
assert.equal(readSessionDraft('bad', '', valid), '');
values[DRAFT_PREFIX + 'old'] = JSON.stringify({ value: 'old', updatedAt: Date.now() - 86_400_001 });
assert.equal(readSessionDraft('old', '', valid), '');
values[DRAFT_PREFIX + 'future'] = JSON.stringify({ value: 'future', updatedAt: Date.now() + 60_000 });
assert.equal(readSessionDraft('future', '', valid), '');
writeSessionDraft('u:vision:screen', 'vision');
values.unrelated = 'preserve';
clearSessionDrafts(['today']);
assert.equal(readSessionDraft('u:today:date', '', valid), '');
assert.equal(readSessionDraft('u:vision:screen', '', valid), 'vision');
clearSessionDrafts();
assert.equal(values.unrelated, 'preserve');
assert.equal(secondsUntil(60_000, 0), 60);
assert.equal(secondsUntil(60_000, 12_500), 48);
assert.equal(secondsUntil(60_000, 61_000), 0);
Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, get() { throw Error('disabled'); } });
assert.doesNotThrow(() => writeSessionDraft('u:today:date', 'keep in memory'));
assert.equal(readSessionDraft('u:today:date', '', valid), '');
console.log('Draft and focus clock checks passed: restore, isolation, expiry, scoped reset, disabled storage and elapsed-time recovery.');
