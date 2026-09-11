import assert from "node:assert/strict";
import {
  executeDataReset,
  DEFAULT_SCOPE_SELECTION,
  ALL_SCOPES_SELECTION,
  type FirestoreAdapter,
  type ResetProgressEvent,
} from "../../persistence/dataResetRepository";
import {
  clearAllAppAStorage,
  resetAppAPreferencesToDefaults,
  APP_A_PREFERENCES_KEY,
} from "../../settings/preferences";

// Setup mocks for storage
const storeMap = new Map<string, string>();
const mockLocalStorage: any = {
  getItem: (k: string) => storeMap.get(k) ?? null,
  setItem: (k: string, v: string) => {
    storeMap.set(k, String(v));
    mockLocalStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    storeMap.delete(k);
    delete mockLocalStorage[k];
  },
  clear: () => {
    for (const k of storeMap.keys()) {
      delete mockLocalStorage[k];
    }
    storeMap.clear();
  },
};
Object.defineProperty(globalThis, "localStorage", {
  value: mockLocalStorage,
  writable: true,
  configurable: true,
});

const sessionMap = new Map<string, string>();
const mockSessionStorage: any = {
  getItem: (k: string) => sessionMap.get(k) ?? null,
  setItem: (k: string, v: string) => {
    sessionMap.set(k, String(v));
    mockSessionStorage[k] = String(v);
  },
  removeItem: (k: string) => {
    sessionMap.delete(k);
    delete mockSessionStorage[k];
  },
  clear: () => {
    for (const k of sessionMap.keys()) {
      delete mockSessionStorage[k];
    }
    sessionMap.clear();
  },
  get length() { return sessionMap.size; }
};
Object.defineProperty(globalThis, "sessionStorage", {
  value: mockSessionStorage,
  writable: true,
  configurable: true,
});

if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = globalThis;
}

interface MockDocRef {
  id: string;
  ref: any;
}

async function runCompleteDataResetTest() {
  console.log("Starting Complete Data Reset & Partial Failure Tests...");

  const { acquireResetLock, releaseResetLock } = await import("../../persistence/resetGuard");
  const userId = "user-test-123";
  const bypassToken = acquireResetLock(userId);

  // Pre-populate storage values
  mockLocalStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify({ language: "sr", theme: "dark" }));
  mockLocalStorage.setItem("app_a_vision_guide_seen_v1", "seen");
  mockLocalStorage.setItem("app_a_today_onboarding_v1", "completed");
  mockLocalStorage.setItem("app_a_dismissed_interventions_2026-09-10", "['test']");
  mockLocalStorage.setItem("abcde_language", "sr");

  mockSessionStorage.setItem("app_a_session_draft:today", "working plan");
  mockSessionStorage.setItem("app_a_session_draft:vision", "working vision");

  // 1. Storage purge test
  clearAllAppAStorage();
  assert.strictEqual(mockLocalStorage.getItem(APP_A_PREFERENCES_KEY), null, "app_a_preferences_v1 should be cleared");
  assert.strictEqual(mockLocalStorage.getItem("app_a_vision_guide_seen_v1"), null, "app_a_vision_guide_seen_v1 should be cleared");
  assert.strictEqual(mockLocalStorage.getItem("app_a_today_onboarding_v1"), null, "app_a_today_onboarding_v1 should be cleared");
  assert.strictEqual(mockLocalStorage.getItem("app_a_dismissed_interventions_2026-09-10"), null, "app_a_dismissed_interventions should be cleared");
  assert.strictEqual(mockLocalStorage.getItem("abcde_language"), "sr", "abcde_language MUST remain untouched across other modules");

  assert.strictEqual(mockSessionStorage.getItem("app_a_session_draft:today"), null, "Session drafts should be cleared");
  console.log("✅ 1. Local storage & session storage swept completely, preserving abcde_language");

  // Reset preferences defaults check
  const defaults = resetAppAPreferencesToDefaults();
  assert.strictEqual(defaults.language, "sr", "Preferences language defaults from intact abcde_language");
  assert.strictEqual(defaults.timeZoneSetting.mode, "automatic", "Timezone mode defaulted to automatic");
  console.log("✅ 2. Preferences successfully reset to fresh defaults with automatic timezone");

  // 2. Mock adapter data for collection clearing test
  const dbStore: Record<string, MockDocRef[]> = {
    "appAUsers/user-test-123/dailyResets": [{ id: "date-1", ref: {} }],
    "appAUsers/user-test-123/rolloverDecisions": [{ id: "roll-1", ref: {} }],
    "appAUsers/user-test-123/inboxItems": [{ id: "inbox-1", ref: {} }],
    "users/user-test-123/visionStrategies": [{ id: "vis-1", ref: {} }],
    "users/user-test-123/todayCandidates": [{ id: "cand-1", ref: {} }],
    "users/user-test-123/routines": [{ id: "rout-1", ref: {} }],
    "users/user-test-123/routineCompletions": [{ id: "comp-1", ref: {} }],
  };

  const createMockAdapter = (failPath?: string): FirestoreAdapter => {
    return {
      getDocsBatch: async (rootCol: string, uid: string, subCol: string) => {
        const path = `${rootCol}/${uid}/${subCol}`;
        if (failPath && path === failPath) {
          throw new Error("mock_firebase_network_error");
        }
        return { docs: dbStore[path] || [] };
      },
      commitBatchDeletes: async (docRefs: any[]) => {
        // Find and delete
        for (const path of Object.keys(dbStore)) {
          dbStore[path] = dbStore[path].filter(d => !docRefs.includes(d.ref));
        }
      }
    };
  };

  // 3. Partial failure test
  // If getDocsBatch fails for users/user-test-123/visionStrategies
  const failingAdapter = createMockAdapter("users/user-test-123/visionStrategies");
  let progressEvents: ResetProgressEvent[] = [];
  let preferencesResetCalled = false;

  const resultPartial = await executeDataReset(userId, DEFAULT_SCOPE_SELECTION, {
    bypassToken,
    adapter: failingAdapter,
    onProgress: (ev) => progressEvents.push(ev),
    onResetPreferences: () => { preferencesResetCalled = true; }
  });

  assert.strictEqual(resultPartial.success, false, "Partial failure should not report success");
  assert.strictEqual(resultPartial.isPartial, true, "Partial failure is marked as isPartial");
  assert.ok(resultPartial.completedScopes.includes("app_a_daily"), "app_a_daily succeeded before failure");
  assert.ok(resultPartial.failedScopes.includes("vision_shared"), "vision_shared failed correctly");
  assert.strictEqual(preferencesResetCalled, false, "Local preferences MUST NOT be reset when remote deletion is incomplete");
  console.log("✅ 3. Partial failure does not display full success, keeps local caches to enable subsequent retry");

  // 4. Retry idempotency & complete recovery
  // When running again with working adapter, remaining collections are swept successfully
  const workingAdapter = createMockAdapter();
  const resultRetry = await executeDataReset(userId, DEFAULT_SCOPE_SELECTION, {
    bypassToken,
    adapter: workingAdapter,
    onResetPreferences: () => { preferencesResetCalled = true; }
  });

  assert.strictEqual(resultRetry.success, true, "Retry finishes remaining scopes and succeeds");
  assert.strictEqual(resultRetry.failedScopes.length, 0, "No failed scopes remain");
  assert.strictEqual(preferencesResetCalled, true, "Local preferences are reset after all remote scopes successfully clear");

  // Check db store is fully cleared for this user
  for (const path of Object.keys(dbStore)) {
    assert.strictEqual(dbStore[path].length, 0, `Collection ${path} should be completely empty`);
  }
  console.log("✅ 4. Idempotent retry checks all collection paths and deletes remaining docs perfectly");

  // 5. Empty account reset
  const emptyDbStore: Record<string, MockDocRef[]> = {};
  const emptyAdapter: FirestoreAdapter = {
    getDocsBatch: async () => ({ docs: [] }),
    commitBatchDeletes: async () => {}
  };
  const emptyResetResult = await executeDataReset(userId, DEFAULT_SCOPE_SELECTION, {
    bypassToken,
    adapter: emptyAdapter,
    onResetPreferences: () => {}
  });
  assert.strictEqual(emptyResetResult.success, true, "Resetting empty account succeeds with 0 docs");
  assert.strictEqual(emptyResetResult.totalDeletedDocuments, 0);
  console.log("✅ 5. Resetting empty accounts works correctly and safely");

  releaseResetLock(bypassToken);
  console.log("All Complete Data Reset & Partial Failure tests passed successfully! 🎉\n");
}

void runCompleteDataResetTest();
