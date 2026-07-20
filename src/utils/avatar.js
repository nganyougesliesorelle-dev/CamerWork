export function resolveAvatarUrl({ existingPhotoURL = '', googlePhotoURL = '', avatarSource = '' } = {}) {
  const hasCustomAvatar = Boolean(existingPhotoURL && String(existingPhotoURL).trim());
  if (avatarSource === 'custom' && hasCustomAvatar) {
    return existingPhotoURL;
  }

  if (avatarSource === 'google' && googlePhotoURL) {
    return googlePhotoURL;
  }

  if (hasCustomAvatar) {
    return existingPhotoURL;
  }

  return googlePhotoURL || '';
}
