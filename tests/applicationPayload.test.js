import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationPayload } from '../src/firebase/authService.js';

test('construit une candidature avec message et CV', () => {
  const payload = buildApplicationPayload({
    job: {
      id: 'job-1',
      title: 'Développeur Frontend',
      company: 'CamerWork',
      recruiterId: 'recruiter-1',
    },
    user: {
      uid: 'cand-1',
      displayName: 'Awa',
      email: 'awa@example.com',
    },
    userData: {
      displayName: 'Awa',
    },
    message: 'Je souhaite rejoindre votre équipe.',
    cvUrl: 'https://example.com/cv.pdf',
    cvName: 'cv.pdf',
  });

  assert.equal(payload.jobId, 'job-1');
  assert.equal(payload.message, 'Je souhaite rejoindre votre équipe.');
  assert.equal(payload.cvUrl, 'https://example.com/cv.pdf');
  assert.equal(payload.cvName, 'cv.pdf');
  assert.equal(payload.status, 'pending');
});
