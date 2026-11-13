import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyPinAttempt,
  attemptsUntilLockout,
  lockoutSecondsForAttempts,
  makePinSecurityState,
  remainingLockoutSeconds,
} from '../src/lib/pinLockout.ts';

const NOW = 1_700_000_000_000;

test('lockout doubles every third failure', () => {
  assert.equal(lockoutSecondsForAttempts(0), 0);
  assert.equal(lockoutSecondsForAttempts(1), 0);
  assert.equal(lockoutSecondsForAttempts(2), 0);
  assert.equal(lockoutSecondsForAttempts(3), 5);
  assert.equal(lockoutSecondsForAttempts(4), 0);
  assert.equal(lockoutSecondsForAttempts(5), 0);
  assert.equal(lockoutSecondsForAttempts(6), 10);
  assert.equal(lockoutSecondsForAttempts(9), 20);
  assert.equal(lockoutSecondsForAttempts(12), 40);
  assert.equal(lockoutSecondsForAttempts(15), 80);
  assert.equal(lockoutSecondsForAttempts(18), 160);
});

test('three failures lock for five seconds and block even the correct PIN', () => {
  let record = { failedAttempts: 0, lockedUntil: null, lastFailureAt: null };
  let result;
  for (let i = 1; i <= 3; i += 1) {
    result = applyPinAttempt(record, false, NOW + i * 1000);
    record = result;
  }

  assert.equal(result.ok, false);
  assert.equal(result.failedAttempts, 3);
  assert.equal(result.locked, true);
  assert.equal(result.lockoutSeconds, 5);
  assert.equal(result.remainingSeconds, 5);
  assert.equal(result.alertDue, true);

  const duringLock = applyPinAttempt(record, true, NOW + 4000);
  assert.equal(duringLock.ok, false);
  assert.equal(duringLock.locked, true);
  assert.equal(duringLock.failedAttempts, 3);
  assert.equal(duringLock.alertDue, false);

  const afterLock = applyPinAttempt(record, true, NOW + 9000);
  assert.equal(afterLock.ok, true);
  assert.equal(afterLock.failedAttempts, 0);
  assert.equal(afterLock.lockedUntil, null);
});

test('six and nine failures escalate to ten and twenty seconds', () => {
  let record = { failedAttempts: 3, lockedUntil: null, lastFailureAt: NOW };
  let result;
  for (let i = 1; i <= 3; i += 1) {
    result = applyPinAttempt(record, false, NOW + i * 1000);
    record = result;
  }
  assert.equal(result.failedAttempts, 6);
  assert.equal(result.lockoutSeconds, 10);

  record = { failedAttempts: 6, lockedUntil: null, lastFailureAt: NOW };
  for (let i = 1; i <= 3; i += 1) {
    result = applyPinAttempt(record, false, NOW + i * 1000);
    record = result;
  }
  assert.equal(result.failedAttempts, 9);
  assert.equal(result.lockoutSeconds, 20);
});

test('countdown rounds up and expires without clearing the failure count', () => {
  assert.equal(remainingLockoutSeconds(NOW + 500, NOW), 1);
  assert.equal(remainingLockoutSeconds(NOW + 1000, NOW), 1);
  assert.equal(remainingLockoutSeconds(NOW, NOW), 0);

  const expired = makePinSecurityState(
    { failedAttempts: 3, lockedUntil: NOW - 1, lastFailureAt: NOW - 5000 },
    NOW
  );
  assert.equal(expired.lockedUntil, null);
  assert.equal(expired.remainingSeconds, 0);
  assert.equal(expired.failedAttempts, 3);
});

test('attempts until the next lockout are shown correctly after expiry', () => {
  assert.equal(attemptsUntilLockout(0), 3);
  assert.equal(attemptsUntilLockout(1), 2);
  assert.equal(attemptsUntilLockout(2), 1);
  assert.equal(attemptsUntilLockout(3), 3);
  assert.equal(attemptsUntilLockout(4), 2);
});
