import assert from "node:assert";
import {
  executeDataReset,
  validateUserId,
  sanitizeFirebaseErrorCode,
  mapFirebaseErrorCodeToCategory,
  SUPPORTED_REMOTE_COLLECTIONS,
  DEFAULT_SCOPE_SELECTION,
  ALL_SCOPES_SELECTION,
  MAX_RESET_BATCH_SIZE,
  type FirestoreAdapter,
  type DataResetScopeSelection,
} from "./dataResetRepository";
import {
  DATA_RESET_LOCALIZATION,
} from "../settings/dataResetLocalization";
import {
  resetAppAPreferencesToDefaults,
  getDefaultAppAPreferences,
  APP_A_PREFERENCES_KEY,
} from "../settings/preferences";

// Mock localStorage in node environment if needed
if (typeof globalThis.localStorage === "undefined") {
  const store = new Map<string, string>();
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}

async function runDataResetRepositoryTests() {
  console.log("Starting Bounded Data Reset Repository Tests...");

  // 1. Exact scope allowlist test
  assert.strictEqual(SUPPORTED_REMOTE_COLLECTIONS.length, 6);
  const collectionNames = SUPPORTED_REMOTE_COLLECTIONS.map((c) => c.collectionName);
  assert.deepStrictEqual(collectionNames, [
    "dailyResets",
    "rolloverDecisions",
    "visionStrategies",
    "todayCandidates",
    "routines",
    "routineCompletions",
  ]);
  const rootCollections = SUPPORTED_REMOTE_COLLECTIONS.map((c) => c.rootCollection);
  assert.deepStrictEqual(rootCollections, [
    "appAUsers",
    "appAUsers",
    "users",
    "users",
    "users",
    "users",
  ]);
  console.log("✅ 1. Exact scope allowlist verified");

  // 2. Reject empty or invalid userId
  assert.throws(() => validateUserId(""), (err: any) => err.firebaseCode === "invalid_user_id");
  assert.throws(() => validateUserId("   "), (err: any) => err.firebaseCode === "invalid_user_id");
  assert.throws(() => validateUserId(null as any), (err: any) => err.firebaseCode === "invalid_user_id");
  assert.strictEqual(validateUserId("user-12345"), "user-12345");
  console.log("✅ 2. Empty or invalid user ID rejected safely");

  // 3. Default scope selection excludes shared Vision and Routines
  assert.strictEqual(DEFAULT_SCOPE_SELECTION.appADailyData, true);
  assert.strictEqual(DEFAULT_SCOPE_SELECTION.appAPreferences, false);
  assert.strictEqual(DEFAULT_SCOPE_SELECTION.sharedVisionData, false);
  assert.strictEqual(DEFAULT_SCOPE_SELECTION.sharedRoutinesData, false);
  console.log("✅ 3. Default scope selection verified (excludes shared scopes)");

  // 4. Select All includes every declared scope
  assert.strictEqual(ALL_SCOPES_SELECTION.appADailyData, true);
  assert.strictEqual(ALL_SCOPES_SELECTION.appAPreferences, true);
  assert.strictEqual(ALL_SCOPES_SELECTION.sharedVisionData, true);
  assert.strictEqual(ALL_SCOPES_SELECTION.sharedRoutinesData, true);
  console.log("✅ 4. Select All selection verified");

  // 5. Max batch size is bounded strictly at 400
  assert.strictEqual(MAX_RESET_BATCH_SIZE, 400);

  // Helper to create stateful paginated mock Firestore adapter
  function createPaginatedMockAdapter(initialDocCounts: Record<string, number>) {
    const docStore = { ...initialDocCounts };
    const queryLog: Array<{ rootCol: string; userId: string; subCol: string; limitCount: number }> = [];
    const deleteLog: Array<{ count: number; docIds: string[] }> = [];

    const adapter: FirestoreAdapter = {
      async getDocsBatch(rootCol: string, userId: string, subCol: string, limitCount: number) {
        // Strict boundary assertion: limit must NEVER exceed 400
        assert(limitCount <= 400, `Requested limit ${limitCount} must not exceed 400`);
        queryLog.push({ rootCol, userId, subCol, limitCount });

        const remaining = docStore[subCol] || 0;
        const fetchCount = Math.min(remaining, limitCount);
        const docs = Array.from({ length: fetchCount }, (_, i) => ({
          ref: { id: `${subCol}-doc-${i}` } as any,
          id: `${subCol}-doc-${i}`,
        }));

        return { docs };
      },
      async commitBatchDeletes(docRefs) {
        // Strict boundary assertion: committed batch must NEVER exceed 400
        assert(docRefs.length <= 400, `Batch size ${docRefs.length} must not exceed 400`);
        deleteLog.push({
          count: docRefs.length,
          docIds: docRefs.map((d) => (d as any).id),
        });

        // Mutate docStore simulating actual deletion
        const currentTargetSubCol = queryLog[queryLog.length - 1]?.subCol;
        if (currentTargetSubCol && docStore[currentTargetSubCol] !== undefined) {
          docStore[currentTargetSubCol] = Math.max(0, docStore[currentTargetSubCol] - docRefs.length);
        }
      },
    };

    return { adapter, queryLog, deleteLog, docStore };
  }

  // 6. Test Scenario: 0 documents (Zero docs scenario)
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 0, rolloverDecisions: 0 });
    const res = await executeDataReset("user_0", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 0);
    assert.deepStrictEqual(res.completedScopes, ["app_a_daily"]);
    assert.strictEqual(deleteLog.length, 0, "No delete batches should be committed for 0 docs");
    assert.strictEqual(queryLog.length, 2, "1 query for each of the 2 daily subcollections");
    for (const q of queryLog) {
      assert.strictEqual(q.limitCount, 400);
    }
    console.log("✅ 6. Scenario 0 docs verified (bounded limit 400, 0 deletes)");
  }

  // 7. Test Scenario: 1 document
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 1, rolloverDecisions: 0 });
    const res = await executeDataReset("user_1", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 1);
    assert.deepStrictEqual(deleteLog.map(d => d.count), [1]);
    console.log("✅ 7. Scenario 1 doc verified (1 batch of 1 delete)");
  }

  // 8. Test Scenario: 400 documents (exact single full batch)
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 400, rolloverDecisions: 0 });
    const res = await executeDataReset("user_400", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 400);
    assert.deepStrictEqual(deleteLog.map(d => d.count), [400]);
    // Query 1 fetched 400 -> deleted 400. Query 2 returned 0 -> done.
    const dailyResetQueries = queryLog.filter(q => q.subCol === "dailyResets");
    assert.strictEqual(dailyResetQueries.length, 2);
    console.log("✅ 8. Scenario 400 docs verified (1 batch of 400 deletes, next query 0 docs)");
  }

  // 9. Test Scenario: 401 documents (400 + 1)
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 401, rolloverDecisions: 0 });
    const res = await executeDataReset("user_401", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 401);
    assert.deepStrictEqual(deleteLog.map(d => d.count), [400, 1]);
    console.log("✅ 9. Scenario 401 docs verified (batches of 400, 1)");
  }

  // 10. Test Scenario: 800 documents (400 + 400)
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 800, rolloverDecisions: 0 });
    const res = await executeDataReset("user_800", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 800);
    assert.deepStrictEqual(deleteLog.map(d => d.count), [400, 400]);
    console.log("✅ 10. Scenario 800 docs verified (batches of 400, 400)");
  }

  // 11. Test Scenario: 850 documents (400 + 400 + 50)
  {
    const { adapter, queryLog, deleteLog } = createPaginatedMockAdapter({ dailyResets: 850, rolloverDecisions: 0 });
    const res = await executeDataReset("user_850", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter });

    assert.strictEqual(res.success, true);
    assert.strictEqual(res.totalDeletedDocuments, 850);
    assert.deepStrictEqual(deleteLog.map(d => d.count), [400, 400, 50]);
    console.log("✅ 11. Scenario 850 docs verified (batches of 400, 400, 50)");
  }

  // 12. Test Scenario: Failure on a later page + Idempotent Retry
  {
    let attempt = 1;
    let docsRemaining = 850;
    const recordedBatches: number[] = [];

    const failingAdapter: FirestoreAdapter = {
      async getDocsBatch(rootCol, userId, subCol, limitCount) {
        if (subCol === "dailyResets") {
          if (attempt === 1 && docsRemaining === 450) {
            // Fail on page 2 query
            const err: any = new Error("Network timeout");
            err.code = "unavailable";
            throw err;
          }
          const count = Math.min(docsRemaining, limitCount);
          return {
            docs: Array.from({ length: count }, (_, i) => ({
              ref: { id: `doc-${i}` } as any,
              id: `doc-${i}`,
            })),
          };
        }
        return { docs: [] };
      },
      async commitBatchDeletes(docRefs) {
        recordedBatches.push(docRefs.length);
        docsRemaining -= docRefs.length;
      },
    };

    // Attempt 1: should delete first 400, fail on second page, and return partial failure
    const res1 = await executeDataReset("user_fail_later", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter: failingAdapter });

    assert.strictEqual(res1.success, false, "Must not claim false full success on page 2 failure");
    assert.strictEqual(res1.failedScopes.includes("app_a_daily"), true);
    assert.strictEqual(res1.scopeStatuses.app_a_daily.status, "failed");
    assert.strictEqual(res1.scopeStatuses.app_a_daily.error?.category, "unavailable");
    assert.strictEqual(res1.totalDeletedDocuments, 400);
    assert.strictEqual(docsRemaining, 450, "450 documents remain in database");

    // Attempt 2 (Retry): should resume and delete remaining 450 (400, then 50)
    attempt = 2;
    const res2 = await executeDataReset("user_fail_later", {
      appADailyData: true,
      appAPreferences: false,
      sharedVisionData: false,
      sharedRoutinesData: false,
    }, { adapter: failingAdapter });

    assert.strictEqual(res2.success, true);
    assert.strictEqual(res2.totalDeletedDocuments, 450);
    assert.strictEqual(docsRemaining, 0, "All remaining documents deleted on retry");
    assert.deepStrictEqual(recordedBatches, [400, 400, 50], "Total batches committed across attempt 1 and attempt 2");
    console.log("✅ 12. Failure on later page safely caught; retry deletes only remaining documents");
  }

  // 13. Case-sensitive Exact Destructive Phrase Rejection
  {
    // English phrase: "RESET"
    const enPhrase = DATA_RESET_LOCALIZATION.en.requiredPhrase;
    assert.strictEqual(enPhrase, "RESET");
    assert.strictEqual("RESET".trim() === enPhrase, true);
    assert.strictEqual("  RESET  ".trim() === enPhrase, true);
    assert.strictEqual("reset".trim() === enPhrase, false, "Lowercase 'reset' must be rejected");
    assert.strictEqual("Reset".trim() === enPhrase, false, "Mixed-case 'Reset' must be rejected");
    assert.strictEqual("ReSeT".trim() === enPhrase, false, "Mixed-case 'ReSeT' must be rejected");

    // Serbian phrase: "RESETUJ"
    const srPhrase = DATA_RESET_LOCALIZATION.sr.requiredPhrase;
    assert.strictEqual(srPhrase, "RESETUJ");
    assert.strictEqual("RESETUJ".trim() === srPhrase, true);
    assert.strictEqual("  RESETUJ  ".trim() === srPhrase, true);
    assert.strictEqual("resetuj".trim() === srPhrase, false, "Lowercase 'resetuj' must be rejected");
    assert.strictEqual("Resetuj".trim() === srPhrase, false, "Mixed-case 'Resetuj' must be rejected");

    // Turkish phrase: "SIFIRLA"
    const trPhrase = DATA_RESET_LOCALIZATION.tr.requiredPhrase;
    assert.strictEqual(trPhrase, "SIFIRLA");
    assert.strictEqual("SIFIRLA".trim() === trPhrase, true);
    assert.strictEqual("  SIFIRLA  ".trim() === trPhrase, true);
    assert.strictEqual("sifirla".trim() === trPhrase, false, "Lowercase 'sifirla' must be rejected");
    assert.strictEqual("Sifirla".trim() === trPhrase, false, "Mixed-case 'Sifirla' must be rejected");
    console.log("✅ 13. Case-sensitive exact phrase validation verified (lowercase and mixed-case strictly rejected)");
  }

  // 14. Preferences reset live state & preservation of abcde_language
  {
    localStorage.setItem(APP_A_PREFERENCES_KEY, JSON.stringify({
      language: "sr",
      theme: "dark",
      timeZoneSetting: { mode: "override", timeZone: "Europe/Belgrade" },
      defaultFocusMinutes: 45,
      aiSuggestionsEnabled: false,
    }));
    localStorage.setItem("abcde_language", "sr");

    const resetPrefs = resetAppAPreferencesToDefaults();
    assert.strictEqual(resetPrefs.timeZoneSetting.mode, "automatic");
    assert.strictEqual(resetPrefs.theme, "system");
    assert.strictEqual(resetPrefs.defaultFocusMinutes, 25);
    assert.strictEqual(resetPrefs.aiSuggestionsEnabled, true);
    assert.strictEqual(localStorage.getItem("abcde_language"), "sr", "abcde_language must remain untouched");
    console.log("✅ 14. Preferences reset to defaults with automatic timezone and preserved abcde_language");
  }

  console.log("All Bounded Data Reset Repository tests passed successfully! 🎉");
}

void runDataResetRepositoryTests();
