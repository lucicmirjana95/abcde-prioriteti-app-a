import assert from 'node:assert/strict';
import { explicitAvailableMinutes } from './availableTime';

for (const [input, expected] of [
  ['I have 90 minutes available. I need to cook for 30 minutes.', 90],
  ['I have two hours today.', 120],
  ['Imam 45 minuta slobodno.', 45],
  ['Imam 2 sata danas.', 120],
  ['Bugün 3 saat zamanım var.', 180],
  ['Cook for 30 minutes and walk the dogs for 60 minutes.', undefined],
  ['I need to finish before 14:00.', undefined],
  ['I have 30 minutes available, or I have 90 minutes free.', undefined],
  ['I have 0 minutes free.', undefined],
  ['I have 25 hours today.', undefined],
] as const) assert.equal(explicitAvailableMinutes(input), expected, input);
console.log('Available time: 10 explicit-budget and ambiguity cases passed.');
