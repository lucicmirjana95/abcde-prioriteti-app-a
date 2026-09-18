export function getBrainDumpStorageKey(userId?: string | null): string {
  return `app_a_brain_dump:${userId || "guest"}`;
}

const memoryCache = new Map<string, string>();

function getStorage(): Storage | null {
  try {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage;
    }
    if (typeof globalThis !== "undefined" && (globalThis as unknown as { localStorage?: Storage }).localStorage) {
      return (globalThis as unknown as { localStorage: Storage }).localStorage;
    }
  } catch {
    return null;
  }
  return null;
}

export function savePersistentBrainDump(brainDump: string, userId?: string | null): void {
  const key = getBrainDumpStorageKey(userId);
  memoryCache.set(key, brainDump);
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(key, brainDump);
  } catch {
    // Gracefully handle storage quotas or disabled storage
  }
}

export function loadPersistentBrainDump(userId?: string | null): string {
  const key = getBrainDumpStorageKey(userId);
  const storage = getStorage();
  if (storage) {
    try {
      const val = storage.getItem(key);
      if (val !== null) return val;
    } catch {
      // Fallback to memory
    }
  }
  return memoryCache.get(key) || "";
}

export function clearPersistentBrainDump(userId?: string | null): void {
  const key = getBrainDumpStorageKey(userId);
  memoryCache.delete(key);
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // Gracefully handle storage errors
  }
}
