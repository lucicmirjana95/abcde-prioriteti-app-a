export async function appAAuthHeaders(): Promise<Record<string, string>> {
  if (typeof window === 'undefined') return {};
  const { auth } = await import('../../lib/firebase');
  await auth.authStateReady();
  const token = await auth.currentUser?.getIdToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
