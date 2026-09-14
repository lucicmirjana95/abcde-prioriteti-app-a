// Central Reset Guard for App A
// Keeps in-memory state, lease management, cross-tab lease synchronization, and generation checks to prevent race conditions.

export interface ActiveResetLock {
  userId: string;
  operationId: string;
  ownerTabId: string;
  startedAt: number;
  heartbeatAt: number;
  expiresAt: number;
  status: "executing" | "failed_pending_retry";
}

const LOCK_KEY = "app_a_active_reset";
const GENERATION_KEY = "app_a_reset_generation";

// Private in-memory capability token for internal data-reset deletion path only
let activeBypassToken: string | null = null;

if (typeof globalThis !== "undefined" && !(globalThis as any).localStorage) {
  const nodeStore = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => (nodeStore.has(k) ? nodeStore.get(k)! : null),
    setItem: (k: string, v: string) => { nodeStore.set(k, String(v)); },
    removeItem: (k: string) => { nodeStore.delete(k); },
    clear: () => { nodeStore.clear(); },
  };
}

if (typeof globalThis !== "undefined" && !(globalThis as any).sessionStorage) {
  const nodeSessionStore = new Map<string, string>();
  (globalThis as any).sessionStorage = {
    getItem: (k: string) => (nodeSessionStore.has(k) ? nodeSessionStore.get(k)! : null),
    setItem: (k: string, v: string) => { nodeSessionStore.set(k, String(v)); },
    removeItem: (k: string) => { nodeSessionStore.delete(k); },
    clear: () => { nodeSessionStore.clear(); },
  };
}

function getStorage(): { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void } {
  if (typeof window !== "undefined" && window.localStorage) {
    return window.localStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).localStorage) {
    return (globalThis as any).localStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  };
}

function getSessionStorage(): { getItem(key: string): string | null; setItem(key: string, value: string): void } {
  if (typeof window !== "undefined" && window.sessionStorage) {
    return window.sessionStorage;
  }
  if (typeof globalThis !== "undefined" && (globalThis as any).sessionStorage) {
    return (globalThis as any).sessionStorage;
  }
  return {
    getItem: () => null,
    setItem: () => {},
  };
}

// Unique ID for the current tab session (survives reloads within the same session)
let tabId = "";
try {
  let id = getSessionStorage().getItem("app_a_tab_id");
  if (!id) {
    id = "tab_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
    getSessionStorage().setItem("app_a_tab_id", id);
  }
  tabId = id;
} catch {
  tabId = "tab_fallback_" + Math.random().toString(36).substring(2);
}

// In-memory record of the reset generation when this script loaded
let tabResetGeneration = 0;
try {
  tabResetGeneration = Number(getStorage().getItem(GENERATION_KEY) || "0");
} catch {
  // ignore
}

export function getTabId(): string {
  try {
    const id = getSessionStorage().getItem("app_a_tab_id");
    if (id) return id;
  } catch {
    // ignore
  }
  return tabId;
}

export function getResetGeneration(): number {
  try {
    return Number(getStorage().getItem(GENERATION_KEY) || "0");
  } catch {
    return tabResetGeneration;
  }
}

export function setResetGeneration(gen: number): void {
  tabResetGeneration = gen;
  try {
    getStorage().setItem(GENERATION_KEY, String(gen));
  } catch {
    // ignore
  }
}

export function incrementResetGeneration(): number {
  const current = Number(getStorage().getItem(GENERATION_KEY) || "0");
  const nextGen = current + 1;
  try {
    getStorage().setItem(GENERATION_KEY, String(nextGen));
  } catch {
    // ignore
  }
  return nextGen;
}

/**
 * Reset Guard Verification for Internal Bypass Capability.
 * Only dataResetRepository holds valid bypass capability.
 */
export function verifyBypassToken(token?: string): boolean {
  if (!token) return false;
  return token === activeBypassToken && activeBypassToken !== null;
}

/**
 * Check if a reset lock is active for a specific user ID.
 * Blocks ALL regular mutations in all tabs, including the owner tab.
 * Only the internal data-reset deletion path passing a valid bypassToken is permitted.
 */
export function isResetBlocked(userId: string | null | undefined, bypassToken?: string): boolean {
  if (!userId) return false;

  // 1. Bypass token verification (private capability for dataResetRepository only)
  if (bypassToken && verifyBypassToken(bypassToken)) {
    return false; // Authorized reset deletion path is NOT blocked
  }

  // 2. Generation Check to reject stale in-flight callbacks or tabs from previous reset
  try {
    const currentGen = Number(getStorage().getItem(GENERATION_KEY) || "0");
    if (currentGen > tabResetGeneration) {
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
      }
      return true;
    }
  } catch {
    // ignore
  }

  // 3. Normal Lock Check (Active cross-tab lease)
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId) {
        if (Date.now() > lock.expiresAt) {
          getStorage().removeItem(LOCK_KEY);
          if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
            window.location.reload();
          }
          return true; // Still blocked until fresh reload and sync completes!
        }
        // Active non-stale lock: block ALL normal mutations in all tabs, INCLUDING ownerTab!
        return true;
      }
    }
  } catch {
    // fallback
  }

  return false;
}

/**
 * Check if reset is blocked for generic operations where userId is not yet known or optional (e.g. preferences, drafts).
 */
export function isResetBlockedGeneric(bypassToken?: string): boolean {
  // 1. Bypass token verification
  if (bypassToken && verifyBypassToken(bypassToken)) {
    return false;
  }

  // 2. Generation Check
  try {
    const currentGen = Number(getStorage().getItem(GENERATION_KEY) || "0");
    if (currentGen > tabResetGeneration) {
      if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
        window.location.reload();
      }
      return true;
    }
  } catch {
    // ignore
  }

  // 3. Normal Lock Check
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock) {
        if (Date.now() > lock.expiresAt) {
          getStorage().removeItem(LOCK_KEY);
          if (typeof window !== "undefined" && typeof window.location?.reload === "function") {
            window.location.reload();
          }
          return true;
        }
        return true;
      }
    }
  } catch {
    // fallback
  }

  return false;
}

/**
 * Acquire cross-tab lease - Returns unique operationId that acts as the private capability token.
 */
export function acquireResetLock(userId: string): string {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const existing: ActiveResetLock = JSON.parse(raw);
      if (existing && Date.now() <= existing.expiresAt) {
        if (existing.userId === userId || existing.ownerTabId !== getTabId()) {
          // Active lease exists! Cannot acquire.
          throw new Error("active_lease_exists");
        }
      }
    }
  } catch (err: any) {
    if (err.message === "active_lease_exists") throw err;
  }

  const operationId = "reset_op_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
  activeBypassToken = operationId;

  const lock: ActiveResetLock = {
    userId,
    operationId,
    ownerTabId: getTabId(),
    startedAt: Date.now(),
    heartbeatAt: Date.now(),
    expiresAt: Date.now() + 10000, // 10 seconds lease duration
    status: "executing",
  };

  try {
    getStorage().setItem(LOCK_KEY, JSON.stringify(lock));
  } catch {
    // ignore
  }

  return operationId;
}

/**
 * Periodic Heartbeat lease renewal.
 * Only the owner tab with the matching operationId can renew the lease.
 */
export function renewResetLease(userId: string, operationId: string): void {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId && lock.operationId === operationId && lock.ownerTabId === getTabId()) {
        lock.heartbeatAt = Date.now();
        lock.expiresAt = Date.now() + 10000; // extend by 10 seconds
        getStorage().setItem(LOCK_KEY, JSON.stringify(lock));
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Update lock status (e.g. executing -> failed_pending_retry).
 */
export function updateResetLockStatus(userId: string, operationId: string, status: "executing" | "failed_pending_retry"): void {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId && lock.operationId === operationId && lock.ownerTabId === getTabId()) {
        lock.status = status;
        lock.heartbeatAt = Date.now();
        lock.expiresAt = Date.now() + 10000;
        getStorage().setItem(LOCK_KEY, JSON.stringify(lock));
      }
    }
  } catch {
    // ignore
  }
}

/**
 * Release lock - Requires matching operationId to guarantee that only the owner can release.
 */
export function releaseResetLock(operationId?: string, isSuccess = false): void {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && (!operationId || lock.operationId === operationId)) {
        getStorage().removeItem(LOCK_KEY);
      }
    }
  } catch {
    // ignore
  }

  if (activeBypassToken === operationId || !operationId) {
    activeBypassToken = null;
  }

  if (isSuccess) {
    incrementResetGeneration();
  }
}

export function initializeResetGuard(): void {
  try {
    tabResetGeneration = Number(getStorage().getItem(GENERATION_KEY) || "0");
  } catch {
    // ignore
  }
}

export function setTabResetGeneration(gen: number): void {
  tabResetGeneration = gen;
}

export async function resolveStaleResetLock(
  userId: string,
  syncCallback?: () => Promise<void>,
): Promise<boolean> {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (!raw) return false;
    const lock: ActiveResetLock = JSON.parse(raw);
    if (!lock || lock.userId !== userId) return false;
    if (Date.now() <= lock.expiresAt) {
      return false; // Active lease must not be resolved as stale
    }
    if (syncCallback) {
      await syncCallback();
    }
    getStorage().removeItem(LOCK_KEY);
    return true;
  } catch {
    return false;
  }
}

export async function runGuardedAsyncAutosave<T>(
  userId: string,
  task: (checkAborted: () => void) => Promise<T>,
): Promise<T> {
  const checkAborted = () => {
    if (isResetBlocked(userId)) {
      throw new Error("reset_in_progress");
    }
  };
  checkAborted();
  const result = await task(checkAborted);
  checkAborted();
  return result;
}

/**
 * Read active reset lock if present.
 */
export function getActiveResetLock(): ActiveResetLock | null {
  try {
    const raw = getStorage().getItem(LOCK_KEY);
    if (!raw) return null;
    const lock: ActiveResetLock = JSON.parse(raw);
    if (!lock || Date.now() > lock.expiresAt) {
      getStorage().removeItem(LOCK_KEY);
      return null;
    }
    return lock;
  } catch {
    return null;
  }
}
