import { isResetBlockedGeneric } from "./resetGuard";

export const DRAFT_PREFIX = 'app_a_session_draft:';
export function readSessionDraft<T>(key: string, fallback: T, valid: (value: unknown) => boolean): T {
  try {
    const entry = JSON.parse(sessionStorage.getItem(DRAFT_PREFIX + key) || 'null');
    const age = Date.now() - entry?.updatedAt;
    return entry && Number.isFinite(age) && age >= 0 && age < 86_400_000 && valid(entry.value) ? entry.value : fallback;
  } catch { return fallback; }
}
export function writeSessionDraft(key: string, value: unknown): void {
  if (isResetBlockedGeneric()) {
    return;
  }
  try { sessionStorage.setItem(DRAFT_PREFIX + key, JSON.stringify({ updatedAt: Date.now(), value })); } catch { /* Memory state remains available. */ }
}
export function clearSessionDrafts(kinds?: string[]): void {
  try { for (const key of Object.keys(sessionStorage)) if (key.startsWith(DRAFT_PREFIX) && (!kinds || kinds.some(kind => key.includes(`:${kind}:`)))) sessionStorage.removeItem(key); } catch { /* Storage may be disabled. */ }
}
