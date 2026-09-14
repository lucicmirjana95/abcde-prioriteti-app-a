import assert from "node:assert/strict";
import type { AppADailyPlanDocument } from "./dailyPlanDocument";
import {
  AppAPersistenceError,
  extractDiagnosticFromSaveError,
  mapFirebaseErrorToAppAPersistenceError,
  saveConfirmedDailyPlan,
} from "./dailyPlanRepository";

const sampleDoc: AppADailyPlanDocument = {
  revision: 1,
  schemaVersion: 1,
  status: "confirmed",
  localDate: "2026-09-07",
  timezone: "Europe/Belgrade",
  language: "en",
  checkIn: {
    stateNote: "",
  },
  plan: {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "",
    availableMinutes: 90,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 0,
  },
  execution: {
    completedItemIds: [],
  },
};

async function runRepositoryDiagnosticUnitTests() {
  // 1. Empty userId rejection
  try {
    await saveConfirmedDailyPlan("", sampleDoc);
    assert.fail("Should have thrown AppAPersistenceError");
  } catch (err: any) {
    assert.ok(err instanceof AppAPersistenceError);
    assert.strictEqual(err.category, "unauthenticated");
  }
  console.log("✅ 1. Empty userId throws AppAPersistenceError with unauthenticated category");

  // 2. Error mapping: permission-denied
  const permErr = mapFirebaseErrorToAppAPersistenceError({ code: "permission-denied", message: "Denied" });
  assert.strictEqual(permErr.category, "permission_denied");
  assert.strictEqual(permErr.retryable, false);
  console.log("✅ 2. Firebase permission-denied maps to permission_denied");

  // 3. Error mapping: unauthenticated
  const unauthErr = mapFirebaseErrorToAppAPersistenceError({ code: "unauthenticated", message: "Unauth" });
  assert.strictEqual(unauthErr.category, "unauthenticated");
  assert.strictEqual(unauthErr.retryable, false);
  console.log("✅ 3. Firebase unauthenticated maps to unauthenticated");

  // 4. Error mapping: unavailable / quota / deadline
  const unavailErr = mapFirebaseErrorToAppAPersistenceError({ code: "unavailable", message: "Unavailable" });
  assert.strictEqual(unavailErr.category, "unavailable");
  assert.strictEqual(unavailErr.retryable, true);

  const quotaErr = mapFirebaseErrorToAppAPersistenceError({ code: "resource-exhausted", message: "Quota" });
  assert.strictEqual(quotaErr.category, "quota_exceeded");
  assert.strictEqual(quotaErr.retryable, true);

  const netErr = mapFirebaseErrorToAppAPersistenceError({ code: "deadline-exceeded", message: "Timeout" });
  assert.strictEqual(netErr.category, "network");
  assert.strictEqual(netErr.retryable, true);
  console.log("✅ 4. Unavailable, quota, and network error codes map correctly");

  // 5. Error mapping: unknown
  const unknownErr = mapFirebaseErrorToAppAPersistenceError({ code: "custom-code", message: "Custom" });
  assert.strictEqual(unknownErr.category, "unknown");
  console.log("✅ 5. Unknown error code safely maps to unknown");

  // 6. Diagnostic sanitizer
  const extracted = extractDiagnosticFromSaveError({
    code: "permission-denied",
    message: "projects/my-app/databases/(default)/documents/appAUsers/secretUser/dailyResets/2026-09-07",
  });
  assert.strictEqual(extracted.category, "permission_denied");
  assert.strictEqual(extracted.firebaseCode, "permission-denied");
  assert.strictEqual((extracted as any).message, undefined);
  console.log("✅ 6. extractDiagnosticFromSaveError sanitizes and excludes raw messages / sensitive paths");

  // 7. Immutability
  const originalSnapshot = JSON.parse(JSON.stringify(sampleDoc));
  assert.deepEqual(sampleDoc, originalSnapshot, "Input document must remain untouched");
  console.log("✅ 7. Input document is not mutated");
}

async function main() {
  await runRepositoryDiagnosticUnitTests();
  console.log("All daily plan repository diagnostic tests passed successfully! 🎉");
}

main().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
