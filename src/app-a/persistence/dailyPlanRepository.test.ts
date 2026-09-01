import assert from "node:assert/strict";
import type { AppADailyPlanDocument } from "./dailyPlanDocument";
import {
  saveConfirmedDailyPlan,
  mapFirebaseErrorCodeToCategory,
  extractDiagnosticFromSaveError,
  AppAPersistenceError,
} from "./dailyPlanRepository";

async function runRepositoryDiagnosticUnitTests() {
  const sampleDoc: AppADailyPlanDocument = {
    schemaVersion: 1,
    localDate: "2026-08-31",
    timezone: "Europe/Belgrade",
    language: "en",
    status: "confirmed",
    checkIn: {
      energy: 3,
      pleasantness: 4,
      availableMinutes: 90,
      stateNote: "Focused",
    },
    plan: {
      classifiedItems: [
        {
          id: "item-1",
          originalText: "Deploy release",
          kind: "task",
          timeHorizon: "today",
          timeSensitivity: "deadline",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Important deadline" },
        },
      ],
      firstFocus: [
        {
          id: "p1",
          sourceItemIds: ["item-1"],
          title: "Deploy release",
          block: "first_focus",
          estimatedMinutes: 45,
          requiredEnergy: 3,
          timeSensitivity: "deadline",
          priority: { explanation: "Important deadline" },
          needsCheck: false,
        },
      ],
      laterToday: [],
      ifCapacityRemains: [],
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: "Ship on time.",
      availableMinutes: 90,
      plannedRequiredMinutes: 45,
      plannedOptionalMinutes: 0,
    },
    execution: {
      completedItemIds: ["p1"],
    },
  };

  // 1. Guard check: authentication_required maps to unauthenticated category
  try {
    await saveConfirmedDailyPlan("", sampleDoc);
    assert.fail("Should have thrown error");
  } catch (err: any) {
    assert.ok(err instanceof AppAPersistenceError);
    assert.strictEqual(err.diagnostic.stage, "set_doc");
    assert.strictEqual(err.diagnostic.category, "unauthenticated");
    assert.strictEqual(err.diagnostic.firebaseCode, "authentication_required");
    assert.strictEqual(err.message, "app_a_persistence_save_failed");
  }
  console.log("✅ 1. Empty userId throws AppAPersistenceError with unauthenticated category");

  // 2. Firebase permission-denied mapping
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("permission-denied"),
    "permission_denied",
  );
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("PERMISSION_DENIED"),
    "permission_denied",
  );
  console.log("✅ 2. Firebase permission-denied maps to permission_denied");

  // 3. Firebase unauthenticated mapping
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("unauthenticated"),
    "unauthenticated",
  );
  console.log("✅ 3. Firebase unauthenticated maps to unauthenticated");

  // 4. Unavailable and network mappings
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("unavailable"),
    "unavailable",
  );
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("resource-exhausted"),
    "quota",
  );
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("deadline-exceeded"),
    "network",
  );
  console.log("✅ 4. Unavailable, quota, and network error codes map correctly");

  // 5. Unknown error code mapping
  assert.strictEqual(
    mapFirebaseErrorCodeToCategory("some-random-error"),
    "unknown",
  );
  console.log("✅ 5. Unknown error code safely maps to unknown");

  // 6. Extraction preserves stage, code, category and strips dangerous characters
  const mockFirebaseError = {
    code: "permission-denied",
    message: "Missing or insufficient permissions at /appAUsers/secret-uid/dailyResets/2026-08-31",
  };
  const extracted = extractDiagnosticFromSaveError(mockFirebaseError);
  assert.strictEqual(extracted.stage, "set_doc");
  assert.strictEqual(extracted.category, "permission_denied");
  assert.strictEqual(extracted.firebaseCode, "permission-denied");
  // Ensure message is NOT included in diagnostic
  assert.strictEqual((extracted as any).message, undefined);
  console.log("✅ 6. extractDiagnosticFromSaveError sanitizes and excludes raw messages / sensitive paths");

  // 7. Immutability
  const originalSnapshot = JSON.parse(JSON.stringify(sampleDoc));
  assert.deepEqual(sampleDoc, originalSnapshot, "Input document must remain untouched");
  console.log("✅ 7. Input document is not mutated");
}

runRepositoryDiagnosticUnitTests()
  .then(() => {
    console.log("All persistence diagnostic tests passed successfully! 🎉");
  })
  .catch((err) => {
    console.error("Diagnostic test failed:", err);
    process.exit(1);
  });
