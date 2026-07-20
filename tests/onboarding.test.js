import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldResumeProfileSetup } from '../src/utils/googleOnboarding.js';

test('shouldResumeProfileSetup returns true for accounts that still need onboarding', () => {
  assert.equal(shouldResumeProfileSetup({ onboardingCompleted: false, setupPending: true }), true);
  assert.equal(shouldResumeProfileSetup({ onboardingCompleted: true, setupPending: false }), false);
});
