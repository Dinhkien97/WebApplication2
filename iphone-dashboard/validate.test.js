import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeReading } from './validate.js';

test('rejects non-objects and empty payloads', () => {
  assert.equal(sanitizeReading(null), null);
  assert.equal(sanitizeReading('x'), null);
  assert.equal(sanitizeReading({}), null);
});

test('keeps valid motion and nulls out-of-range values', () => {
  const r = sanitizeReading({ motion: { ax: 1.5, ay: 9999, az: NaN, heading: 400 } });
  assert.equal(r.motion.ax, 1.5);
  assert.equal(r.motion.ay, null);
  assert.equal(r.motion.az, null);
  assert.equal(r.motion.heading, null);
});

test('drops geo with invalid coordinates', () => {
  assert.equal(sanitizeReading({ geo: { lat: 100, lon: 0 } }), null);
  assert.deepEqual(sanitizeReading({ geo: { lat: 21, lon: 105, acc: 5 } }).geo.lat, 21);
});
