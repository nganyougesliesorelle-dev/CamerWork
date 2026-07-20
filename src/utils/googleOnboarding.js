export function shouldShowGoogleProfileSetup(result, userData = {}) {
  if (!result?.success) return false;
  if (result.isNew) return true;
  if (result.needsProfileSetup) return true;
  const onboardingCompleted = userData?.onboardingCompleted;
  const setupPending = userData?.setupPending;
  return onboardingCompleted === false || setupPending === true;
}

export function shouldResumeProfileSetup(userData = {}) {
  if (!userData) return false;
  return userData.setupPending === true || userData.onboardingCompleted === false;
}
