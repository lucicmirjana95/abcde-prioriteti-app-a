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

// Unique ID for the current tab session (survives reloads within the same session)
let tabId = "";
if (typeof window !== "undefined") {
  try {
    let id = sessionStorage.getItem("app_a_tab_id");
    if (!id) {
      id = "tab_" + Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem("app_a_tab_id", id);
    }
    tabId = id;
  } catch {
    tabId = "tab_fallback_" + Math.random().toString(36).substring(2);
  }
}

// In-memory record of the reset generation when this script loaded
let tabResetGeneration = 0;
if (typeof window !== "undefined") {
  try {
    tabResetGeneration = Number(localStorage.getItem(GENERATION_KEY) || "0");
  } catch {
    // ignore
  }
}

export function getTabId(): string {
  if (typeof window !== "undefined") {
    try {
      const id = sessionStorage.getItem("app_a_tab_id");
      if (id) return id;
    } catch {
      // ignore
    }
  }
  return tabId;
}

export function getResetGeneration(): number {
  if (typeof window !== "undefined") {
    try {
      return Number(localStorage.getItem(GENERATION_KEY) || "0");
    } catch {
      return 0;
    }
  }
  return 0;
}

export function setTabResetGeneration(gen: number): void {
  tabResetGeneration = gen;
}

export function initializeResetGuard(): void {
  if (typeof window === "undefined") return;

  // On fresh load/reload, check if there is an active lock in localStorage
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && Date.now() <= lock.expiresAt) {
        // Active non-stale lock exists!
        // Another tab on reload MUST NOT remove active, non-expired lock!
        return;
      }
      // If lock is stale on fresh load, clean it up since this page load is performing fresh server sync
      if (lock && Date.now() > lock.expiresAt) {
        localStorage.removeItem(LOCK_KEY);
      }
    }
  } catch {
    // ignore
  }

  // Listen for storage events to synchronize lock across tabs
  try {
    window.addEventListener("storage", (event) => {
      if (event.key === LOCK_KEY) {
        // storage event automatically observed by subsequent isResetBlocked calls
      }
    });
  } catch {
    // ignore
  }
}

/**
 * Verifies if the provided capability token matches the active private deletion capability.
 * Checks both in-memory private token AND non-expired active lease in localStorage.
 */
export function verifyBypassToken(token: unknown): boolean {
  if (typeof token !== "string" || !token) return false;
  if (token !== activeBypassToken) return false;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return false;
    const lock: ActiveResetLock = JSON.parse(raw);
    if (!lock || lock.operationId !== token || Date.now() > lock.expiresAt) {
      return false;
    }
  } catch {
    return false;
  }
  return true;
}

/**
 * Check if a reset lock is active for a specific user ID.
 * Blocks ALL regular mutations in all tabs, including the owner tab.
 * Only the internal data-reset deletion path passing a valid bypassToken is permitted.
 */
export function isResetBlocked(userId: string | null | undefined, bypassToken?: string): boolean {
  if (typeof window === "undefined") return false;
  if (!userId) return false;

  // 1. Bypass token verification (private capability for dataResetRepository only)
  if (bypassToken && verifyBypassToken(bypassToken)) {
    return false; // Authorized reset deletion path is NOT blocked
  }

  // 2. Generation Check to reject stale in-flight callbacks or tabs from previous reset
  try {
    const currentGen = Number(localStorage.getItem(GENERATION_KEY) || "0");
    if (currentGen > tabResetGeneration) {
      if (typeof window.location?.reload === "function") {
        window.location.reload();
      }
      return true;
    }
  } catch {
    // ignore
  }

  // 3. Normal Lock Check (Active cross-tab lease)
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId) {
        if (Date.now() > lock.expiresAt) {
          // Stale lock detected (expired).
          // Stale lock may only be resolved after expiration AND fresh server synchronization.
          // Triggering window.location.reload() ensures all local in-memory state is flushed,
          // and fresh documents are loaded directly from the server.
          localStorage.removeItem(LOCK_KEY);
          if (typeof window.location?.reload === "function") {
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
  if (typeof window === "undefined") return false;

  // 1. Bypass token verification
  if (bypassToken && verifyBypassToken(bypassToken)) {
    return false;
  }

  // 2. Generation Check
  try {
    const currentGen = Number(localStorage.getItem(GENERATION_KEY) || "0");
    if (currentGen > tabResetGeneration) {
      if (typeof window.location?.reload === "function") {
        window.location.reload();
      }
      return true;
    }
  } catch {
    // ignore
  }

  // 3. Normal Lock Check
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock) {
        if (Date.now() > lock.expiresAt) {
          localStorage.removeItem(LOCK_KEY);
          if (typeof window.location?.reload === "function") {
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
  if (typeof window === "undefined") return "";

  try {
    const raw = localStorage.getItem(LOCK_KEY);
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
    localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
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
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId && lock.operationId === operationId && lock.ownerTabId === getTabId()) {
        lock.heartbeatAt = Date.now();
        lock.expiresAt = Date.now() + 10000; // extend by 10 seconds
        localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
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
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (lock && lock.userId === userId && lock.operationId === operationId && lock.ownerTabId === getTabId()) {
        lock.status = status;
        lock.heartbeatAt = Date.now();
        lock.expiresAt = Date.now() + 10000;
        localStorage.setItem(LOCK_KEY, JSON.stringify(lock));
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
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (raw) {
      const lock: ActiveResetLock = JSON.parse(raw);
      if (operationId && lock && lock.operationId !== operationId) {
        // Wrong operationId cannot release lock
        return;
      }
    }

    if (isSuccess) {
      // Increments the reset generation to invalidate any stale in-flight callbacks or tabs
      const currentGen = Number(localStorage.getItem(GENERATION_KEY) || "0");
      localStorage.setItem(GENERATION_KEY, String(currentGen + 1));
    }

    localStorage.removeItem(LOCK_KEY);
    activeBypassToken = null;
  } catch {
    // ignore
  }
}

/**
 * Resolves a stale reset lock strictly after expiration AND fresh server synchronization.
 * If the lock is not expired, or if server sync fails, the lock is not resolved.
 */
export async function resolveStaleResetLock(
  userId: string,
  performServerSync?: () => Promise<void>
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(LOCK_KEY);
    if (!raw) return false;
    const lock: ActiveResetLock = JSON.parse(raw);
    if (!lock || lock.userId !== userId) return false;

    // Check expiration
    if (Date.now() <= lock.expiresAt) {
      // Lease has NOT expired! An active lease cannot be resolved as stale.
      return false;
    }

    // Lock has expired. Now perform fresh server synchronization before removing lock.
    if (performServerSync) {
      await performServerSync();
    } else if (typeof window.location?.reload === "function") {
      localStorage.removeItem(LOCK_KEY);
      window.location.reload();
      return true;
    }

    // Only after successful fresh server sync is the stale lock removed
    localStorage.removeItem(LOCK_KEY);
    return true;
  } catch {
    // If sync fails or error occurs, do not silently clear valid lock
    return false;
  }
}

/**
 * Guards an asynchronous autosave or mutation operation initiated before or during reset.
 * Checks reset status both BEFORE starting and immediately BEFORE committing the write.
 */
export async function runGuardedAsyncAutosave<T>(
  userId: string,
  operation: (checkAborted: () => void) => Promise<T>
): Promise<T> {
  if (isResetBlocked(userId)) {
    throw new Error("reset_in_progress");
  }
  const initialGen = Number(localStorage.getItem(GENERATION_KEY) || "0");
  const checkAborted = () => {
    if (isResetBlocked(userId)) {
      throw new Error("reset_in_progress");
    }
    const currentGen = Number(localStorage.getItem(GENERATION_KEY) || "0");
    if (currentGen !== initialGen) {
      throw new Error("reset_generation_changed");
    }
  };

  const result = await operation(checkAborted);
  checkAborted();
  return result;
}

// Run initializer immediately on script load
initializeResetGuard();
