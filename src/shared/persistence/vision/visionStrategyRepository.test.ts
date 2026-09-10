import assert from "node:assert/strict";
import { checkVisionStrategyRevision, getVisionSaveDiagnostic, VisionPersistenceError } from "./visionStrategyRepository";
import type { SavedVisionStrategy } from "../../domain/vision";

assert.deepEqual(getVisionSaveDiagnostic({ code: "permission-denied" }), { stage: "set_doc", category: "permission_denied", firebaseCode: "permission-denied" });
assert.deepEqual(getVisionSaveDiagnostic({ code: "auth/unauthenticated" }), { stage: "set_doc", category: "unauthenticated", firebaseCode: "auth/unauthenticated" });
assert.equal(getVisionSaveDiagnostic({ code: "unavailable" }).category, "unavailable");
assert.equal(getVisionSaveDiagnostic({ code: "deadline-exceeded" }).category, "network");
assert.equal(getVisionSaveDiagnostic({ code: "invalid-data" }).category, "invalid_data");
assert.deepEqual(getVisionSaveDiagnostic({ code: "vision_changed_elsewhere" }), {
  stage: "set_doc",
  category: "version_conflict",
  firebaseCode: "vision_changed_elsewhere",
});
assert.deepEqual(getVisionSaveDiagnostic(new Error("vision_changed_elsewhere")), {
  stage: "set_doc",
  category: "version_conflict",
  firebaseCode: "vision_changed_elsewhere",
});

const wrapped = new VisionPersistenceError({ stage: "set_doc", category: "permission_denied", firebaseCode: "permission-denied" });
assert.equal(getVisionSaveDiagnostic(wrapped).category, "permission_denied");
assert.equal(JSON.stringify(getVisionSaveDiagnostic({ code: "permission-denied", message: "users/private/path" })).includes("private"), false);

const conflictError = new VisionPersistenceError({ stage: "set_doc", category: "version_conflict", firebaseCode: "vision_changed_elsewhere" });
assert.equal(conflictError.message, "vision_changed_elsewhere");
assert.equal(getVisionSaveDiagnostic(conflictError).category, "version_conflict");

const dummyStrategy: SavedVisionStrategy = {
  id: "vision_test_123",
  idea: "Build a scalable product",
  language: "en",
  strategy: {
    outcome: "A scalable and robust product",
    importance: "Key business driver",
    nextStep: "First step",
    milestones: [{ title: "M1", result: "Prototype ready", steps: ["Step 1"] }],
    assumptions: ["User demand"],
    risks: ["Market risk"],
  },
  stepBreakdowns: {},
  createdAt: "2026-09-10T10:00:00.000Z",
  updatedAt: "2026-09-10T10:00:00.000Z",
};

// 1. Initial write when document doesn't exist yet
const initialWrite = checkVisionStrategyRevision(null, dummyStrategy);
assert.deepEqual(initialWrite, { valid: true, nextRevision: 1 });

// 2. Successful update when revisions match
const docAtRev1 = { revision: 1 };
const updateRev1 = checkVisionStrategyRevision(docAtRev1, { ...dummyStrategy, revision: 1 });
assert.deepEqual(updateRev1, { valid: true, nextRevision: 2 });

// 3. Conflict when document in database was changed elsewhere (e.g. at revision 2, but client still has revision 1)
const docAtRev2 = { revision: 2 };
const conflictAttempt = checkVisionStrategyRevision(docAtRev2, { ...dummyStrategy, revision: 1 });
assert.deepEqual(conflictAttempt, {
  valid: false,
  error: "vision_changed_elsewhere",
  existingRevision: 2,
  incomingRevision: 1,
});

// 4. Retry flow: after user/client syncs latest revision (now 2), save succeeds with revision 3
const retryAttempt = checkVisionStrategyRevision(docAtRev2, { ...dummyStrategy, revision: 2 });
assert.deepEqual(retryAttempt, { valid: true, nextRevision: 3 });

// 5. Deleted document rejects
const deletedAttempt = checkVisionStrategyRevision({ deleted: true }, dummyStrategy);
assert.deepEqual(deletedAttempt, { valid: false, error: "vision_deleted" });

console.log("Vision persistence diagnostic & revision concurrency tests passed.");
