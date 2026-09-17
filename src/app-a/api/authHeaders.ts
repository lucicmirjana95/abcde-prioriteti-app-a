export async function appAAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    const { auth } = await import('../../lib/firebase');
    // Fast check if current user is already present
    if (auth.currentUser) {
      const token = await auth.currentUser.getIdToken();
      return token ? { Authorization: `Bearer ${token}` } : {};
    }
    // Race authStateReady with a 2s timeout so unauthenticated/guest users never hang
    await Promise.race([
      auth.authStateReady(),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ]);
    const token = await auth.currentUser?.getIdToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}
