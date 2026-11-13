import test from 'node:test';
import assert from 'node:assert/strict';
import {
  adminPasswordError,
  loginFormValid,
  normalizeLoginIdentifier,
  signupPasswordError,
} from '../src/lib/authRules.ts';

test('the temporary admin password is accepted by the login form', () => {
  assert.equal(loginFormValid('user', '12345'), true);
  assert.equal(loginFormValid('  USER  ', '12345'), true);
});

test('login requires an identifier and a password', () => {
  assert.equal(loginFormValid('', 'secret'), false);
  assert.equal(loginFormValid('user', ''), false);
});

test('login identifiers are trimmed and lowercased', () => {
  assert.equal(normalizeLoginIdentifier('  User  '), 'user');
  assert.equal(normalizeLoginIdentifier('Parent@Example.com'), 'parent@example.com');
});

test('new parent passwords still require six characters', () => {
  assert.equal(signupPasswordError('12345'), 'Password must be at least 6 characters.');
  assert.equal(signupPasswordError('123456'), null);
});

test('administrator bootstrap password must be replaced with a strong value', () => {
  assert.match(adminPasswordError('12345', '12345'), /8 characters/);
  assert.match(adminPasswordError('12345678', '12345679'), /do not match/);
  assert.equal(adminPasswordError('12345678', '12345678'), null);
  assert.equal(adminPasswordError('Kf-Admin-2026!', 'Kf-Admin-2026!'), null);
});
