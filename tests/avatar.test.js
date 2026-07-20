import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAvatarUrl } from '../src/utils/avatar.js';

test('preserve a manually uploaded avatar over a Google profile picture', () => {
  const url = resolveAvatarUrl({
    existingPhotoURL: 'https://firebasestorage.googleapis.com/avatars/me.png',
    googlePhotoURL: 'https://lh3.googleusercontent.com/a/123',
    avatarSource: 'custom',
  });

  assert.equal(url, 'https://firebasestorage.googleapis.com/avatars/me.png');
});

test('use the Google photo when no custom avatar exists', () => {
  const url = resolveAvatarUrl({
    existingPhotoURL: '',
    googlePhotoURL: 'https://lh3.googleusercontent.com/a/123',
    avatarSource: 'google',
  });

  assert.equal(url, 'https://lh3.googleusercontent.com/a/123');
});
