import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApplicationPayload, mergeCvLibraryEntries } from '../src/firebase/authService.js';

test('buildApplicationPayload keeps the selected CV metadata for applications', () => {
  const payload = buildApplicationPayload({
    job: { id: 'job-1', title: 'Développeur', company: 'Acme' },
    user: { uid: 'user-1', email: 'candidate@example.com' },
    userData: { displayName: 'Ada' },
    message: 'Bonjour',
    cvUrl: 'https://cdn.example.com/cv.pdf',
    cvName: 'cv-dev.pdf',
    cvLabel: 'CV Développement',
    cvId: 'cv-1',
  });

  assert.equal(payload.cvUrl, 'https://cdn.example.com/cv.pdf');
  assert.equal(payload.cvName, 'cv-dev.pdf');
  assert.equal(payload.cvLabel, 'CV Développement');
  assert.equal(payload.cvId, 'cv-1');
});

test('mergeCvLibraryEntries appends a new CV entry without replacing the existing library', () => {
  const existing = [{ id: 'cv-1', url: 'https://cdn.example.com/cv-1.pdf', name: 'cv-1.pdf', label: 'CV Dev' }];
  const merged = mergeCvLibraryEntries(existing, { id: 'cv-2', url: 'https://cdn.example.com/cv-2.pdf', name: 'cv-2.pdf', label: 'CV Data' });

  assert.equal(merged.length, 2);
  assert.deepEqual(merged.map((cv) => cv.id), ['cv-1', 'cv-2']);
});
