import test from 'node:test';
import assert from 'node:assert/strict';
import { cpuPercents } from './metrics.js';

test('computes per-core usage from tick deltas', () => {
  const prev = [{ idle: 100, total: 200 }, { idle: 0, total: 0 }];
  const curr = [{ idle: 150, total: 300 }, { idle: 0, total: 100 }];
  assert.deepEqual(cpuPercents(prev, curr), [50, 100]);
});

test('returns 0 when no ticks elapsed', () => {
  const s = [{ idle: 5, total: 10 }];
  assert.deepEqual(cpuPercents(s, s), [0]);
});
