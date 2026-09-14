import assert from "node:assert/strict";
import {
  getRolloverDecisionId,
  computeDeterministicDigest128,
  type AppARolloverDecision,
  type UnfinishedRolloverCandidate,
} from "../domain/rollover/contracts";
import type { AppADailyPlanDocument } from "./dailyPlanDocument";
import {
  saveDailyPlanWithRolloverDecisionAtomic,
  markHistoricalTaskComplete,
} from "./rolloverRepository";

console.log("Running Rollover Atomic Writes & Decision Identity Tests...");

// -------------------------------------------------------------
// 1. Deterministic Bounded Path-Safe Decision IDs
// -------------------------------------------------------------

// Basic identity
const baseId = getRolloverDecisionId("2026-09-01", "task-abc");
assert.equal(baseId, getRolloverDecisionId("2026-09-01", "task-abc"));
assert.ok(baseId.length > 0 && baseId.length <= 128);
assert.ok(!baseId.includes("/"));
assert.ok(!baseId.includes(" "));
assert.ok(!baseId.includes(".."));

// Slashes in IDs
const slashId = getRolloverDecisionId("2026-09-01", "projects/proj-1/tasks/sub/99");
assert.ok(!slashId.includes("/"), "Slash must be digested, not raw");
assert.ok(slashId.length <= 128);
assert.equal(slashId, getRolloverDecisionId("2026-09-01", "projects/proj-1/tasks/sub/99"));

// Unicode, emojis, spaces, punctuation
const complexUnicodeId = "💡 Pripremiti izveštaj & poslati @ Mirjana (rok: 18:00h)! 🚀";
const unicodeDocId = getRolloverDecisionId("2026-09-01", complexUnicodeId);
assert.ok(!unicodeDocId.includes("/"));
assert.ok(unicodeDocId.length <= 128);
assert.equal(unicodeDocId, getRolloverDecisionId("2026-09-01", complexUnicodeId));

// Extremely long IDs (5,000 chars)
const hugeId = "task_id_".repeat(600);
const hugeDocId = getRolloverDecisionId("2026-09-01", hugeId);
assert.ok(hugeDocId.length <= 128);
assert.equal(hugeDocId, getRolloverDecisionId("2026-09-01", hugeId));

// Distinct inputs produce distinct IDs (no accidental collisions or normalizations)
const idSet = new Set<string>([
  getRolloverDecisionId("2026-09-01", "task-1"),
  getRolloverDecisionId("2026-09-01", "task-2"),
  getRolloverDecisionId("2026-09-02", "task-1"),
  getRolloverDecisionId("2026-09-01", "TASK-1"),
  getRolloverDecisionId("2026-09-01", "task 1"),
  getRolloverDecisionId("2026-09-01", "task1"),
  getRolloverDecisionId("2026-09-01", "task-1/sub"),
]);
assert.equal(idSet.size, 7, "All distinct inputs must yield distinct IDs");

// Digest test
const d1 = computeDeterministicDigest128("test-digest-input");
const d2 = computeDeterministicDigest128("test-digest-input");
const d3 = computeDeterministicDigest128("test-digest-input-different");
assert.equal(d1, d2);
assert.notEqual(d1, d3);
assert.equal(d1.length, 32);

// -------------------------------------------------------------
// 2. Input Immutability & Parameter Validation
// -------------------------------------------------------------

const sampleDoc: AppADailyPlanDocument = {
  schemaVersion: 1,
  localDate: "2026-09-02",
  timezone: "UTC",
  language: "en",
  status: "confirmed",
  checkIn: { availableMinutes: 120 },
  plan: {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Test plan",
    availableMinutes: 120,
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 0,
  },
  execution: {
    completedItemIds: [],
  },
};

const sampleDecision: AppARolloverDecision = {
  sourceLocalDate: "2026-09-01",
  sourcePlanItemId: "task-prev-1",
  status: "carried",
};

// Freeze inputs to strictly enforce immutability
const frozenDoc = JSON.parse(JSON.stringify(sampleDoc));
Object.freeze(frozenDoc);
Object.freeze(frozenDoc.plan);
Object.freeze(frozenDoc.execution);

const frozenDecision = Object.freeze({ ...sampleDecision });

// Parameter validations
await assert.rejects(
  async () => {
    await saveDailyPlanWithRolloverDecisionAtomic("", frozenDoc, frozenDecision);
  },
  { message: "invalid_atomic_write_params" },
  "Empty userId must reject atomic write",
);

await assert.rejects(
  async () => {
    await saveDailyPlanWithRolloverDecisionAtomic("user-1", { ...frozenDoc, localDate: "" }, frozenDecision);
  },
  { message: "invalid_atomic_write_params" },
  "Empty localDate must reject atomic write",
);

await assert.rejects(
  async () => {
    await markHistoricalTaskComplete("", "2026-09-01", "item-1");
  },
  { message: "invalid_mark_complete_params" },
  "Empty userId must reject mark complete",
);

await assert.rejects(
  async () => {
    await markHistoricalTaskComplete("user-1", "", "item-1");
  },
  { message: "invalid_mark_complete_params" },
  "Empty sourceLocalDate must reject mark complete",
);

await assert.rejects(
  async () => {
    await markHistoricalTaskComplete("user-1", "2026-09-01", "");
  },
  { message: "invalid_mark_complete_params" },
  "Empty sourcePlanItemId must reject mark complete",
);

// -------------------------------------------------------------
// 3. Atomic Write Batch Emulation & Failure Resilience
// -------------------------------------------------------------

// Verify that if a batch fails, local state is not mutated and failure propagates cleanly
interface MockBatchOp {
  type: "set" | "update";
  path: string;
  data: any;
}

class MockFirestoreBatch {
  ops: MockBatchOp[] = [];
  shouldFail = false;

  set(ref: { path: string }, data: any) {
    this.ops.push({ type: "set", path: ref.path, data });
  }

  update(ref: { path: string }, data: any) {
    this.ops.push({ type: "update", path: ref.path, data });
  }

  async commit(): Promise<void> {
    if (this.shouldFail) {
      throw new Error("firestore_batch_network_failure");
    }
  }
}

// Emulate atomic Add to Today execution
async function executeAtomicAddSimulation(
  batch: MockFirestoreBatch,
  docData: AppADailyPlanDocument,
  candidate: UnfinishedRolloverCandidate,
  userId: string,
) {
  const planDocPath = `appAUsers/${userId}/dailyResets/${docData.localDate}`;
  const decisionId = getRolloverDecisionId(candidate.sourceLocalDate, candidate.id);
  const decisionDocPath = `appAUsers/${userId}/rolloverDecisions/${decisionId}`;

  batch.set({ path: planDocPath }, { ...docData, updatedAt: "SERVER_TIMESTAMP" });
  batch.set({ path: decisionDocPath }, {
    sourceLocalDate: candidate.sourceLocalDate,
    sourcePlanItemId: candidate.id,
    status: "carried",
    updatedAt: "SERVER_TIMESTAMP",
  });

  await batch.commit();
}

// Test 3a: Successful atomic Add to Today records both operations in one batch
const successBatch = new MockFirestoreBatch();
const candidateToCarry: UnfinishedRolloverCandidate = {
  id: "item-carry-1",
  sourceLocalDate: "2026-09-01",
  title: "Prepare Slide Deck",
  estimatedMinutes: 30,
  originalBlock: "first_focus",
  requiredEnergy: 3,
  timeSensitivity: "none",
  priority: { explanation: "Important presentation" },
};

await executeAtomicAddSimulation(successBatch, frozenDoc, candidateToCarry, "test-user-123");
assert.equal(successBatch.ops.length, 2, "Both plan and decision must be in single batch");
assert.equal(successBatch.ops[0]?.path, "appAUsers/test-user-123/dailyResets/2026-09-02");
assert.equal(successBatch.ops[1]?.path, `appAUsers/test-user-123/rolloverDecisions/${getRolloverDecisionId("2026-09-01", "item-carry-1")}`);
assert.equal(successBatch.ops[1]?.data.status, "carried");

// Test 3b: Failed atomic Add propagates error with NO state application
const failingBatch = new MockFirestoreBatch();
failingBatch.shouldFail = true;

let localCandidateList = [candidateToCarry];
let isSaved = false;

try {
  await executeAtomicAddSimulation(failingBatch, frozenDoc, candidateToCarry, "test-user-123");
  // If this line were reached, it would falsely mark success:
  localCandidateList = localCandidateList.filter((c) => c.id !== candidateToCarry.id);
  isSaved = true;
} catch (err: any) {
  assert.equal(err.message, "firestore_batch_network_failure");
}

// Local UI state MUST remain completely intact and retryable:
assert.equal(localCandidateList.length, 1, "Candidate must NOT be removed from local UI on failure");
assert.equal(isSaved, false, "Save must not be marked successful on failure");

// Test 3c: Successful atomic Mark Complete simulation
async function executeAtomicMarkCompleteSimulation(
  batch: MockFirestoreBatch,
  sourceLocalDate: string,
  sourcePlanItemId: string,
  existingCompletedIds: string[],
  userId: string,
) {
  const planDocPath = `appAUsers/${userId}/dailyResets/${sourceLocalDate}`;
  const decisionId = getRolloverDecisionId(sourceLocalDate, sourcePlanItemId);
  const decisionDocPath = `appAUsers/${userId}/rolloverDecisions/${decisionId}`;

  const nextCompleted = Array.from(new Set([...existingCompletedIds, sourcePlanItemId]));

  batch.update({ path: planDocPath }, {
    "execution.completedItemIds": nextCompleted,
    updatedAt: "SERVER_TIMESTAMP",
  });
  batch.set({ path: decisionDocPath }, {
    sourceLocalDate,
    sourcePlanItemId,
    status: "carried",
    updatedAt: "SERVER_TIMESTAMP",
  });

  await batch.commit();
}

const completeBatch = new MockFirestoreBatch();
await executeAtomicMarkCompleteSimulation(
  completeBatch,
  "2026-09-01",
  "historical-task-99",
  ["existing-1"],
  "user-abc",
);

assert.equal(completeBatch.ops.length, 2);
assert.equal(completeBatch.ops[0]?.path, "appAUsers/user-abc/dailyResets/2026-09-01");
assert.deepEqual(completeBatch.ops[0]?.data["execution.completedItemIds"], ["existing-1", "historical-task-99"]);
assert.equal(completeBatch.ops[1]?.path, `appAUsers/user-abc/rolloverDecisions/${getRolloverDecisionId("2026-09-01", "historical-task-99")}`);
assert.equal(completeBatch.ops[1]?.data.status, "carried");

// Test 3d: Idempotent repeated actions
const repeatedBatch = new MockFirestoreBatch();
await executeAtomicMarkCompleteSimulation(
  repeatedBatch,
  "2026-09-01",
  "historical-task-99",
  ["existing-1", "historical-task-99"], // already contains the item
  "user-abc",
);
assert.deepEqual(
  repeatedBatch.ops[0]?.data["execution.completedItemIds"],
  ["existing-1", "historical-task-99"],
  "Completed item IDs must not have duplicates",
);

// Test 3e: Failed atomic Mark Complete simulation
const failingCompleteBatch = new MockFirestoreBatch();
failingCompleteBatch.shouldFail = true;
let candidateMarked = false;

try {
  await executeAtomicMarkCompleteSimulation(
    failingCompleteBatch,
    "2026-09-01",
    "historical-task-99",
    ["existing-1"],
    "user-abc",
  );
  candidateMarked = true;
} catch (err: any) {
  assert.equal(err.message, "firestore_batch_network_failure");
}
assert.equal(candidateMarked, false, "Must not mark complete if atomic batch commit fails");

console.log("Rollover Atomic Writes & Decision Identity Tests passed successfully.");
