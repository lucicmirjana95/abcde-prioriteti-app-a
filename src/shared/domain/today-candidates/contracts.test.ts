import assert from "node:assert/strict";
import { createSequencedVisionCandidate, createTodayCandidateId, getNextVisionSequenceIndex, getVisionStepSequence, isTodayCandidate, type TodayCandidate } from "./contracts";
import type { SavedVisionStrategy } from "../vision";

const candidate: TodayCandidate = {
  id: "candidate_test_1234",
  source: "vision",
  sourceId: "vision_test_1234",
  title: "Write the first page of the outline",
  estimatedMinutes: 25,
  status: "pending",
  createdAt: "2026-09-01T10:00:00.000Z",
  updatedAt: "2026-09-01T10:00:00.000Z",
};

assert.equal(isTodayCandidate(candidate), true);
assert.equal(isTodayCandidate({ ...candidate, estimatedMinutes: 0 }), false);
assert.equal(isTodayCandidate({ ...candidate, estimatedMinutes: 25.5 }), false);
assert.equal(isTodayCandidate({ ...candidate, estimatedMinutes: 481 }), false);
assert.equal(isTodayCandidate({ ...candidate, title: "  " }), false);
assert.equal(isTodayCandidate({ ...candidate, status: "unknown" }), false);
assert.equal(isTodayCandidate({ ...candidate, source: "unknown" }), false);
assert.equal(createTodayCandidateId("vision_same_source"), createTodayCandidateId("vision_same_source"));
assert.notEqual(createTodayCandidateId("vision_same_source"), createTodayCandidateId("vision_other_source"));
assert.equal(isTodayCandidate({ ...candidate, status: "scheduled", sequenceIndex: 0 }), true);
assert.equal(isTodayCandidate({ ...candidate, status: "completed", sequenceIndex: 1 }), true);
assert.equal(isTodayCandidate({ ...candidate, sequenceIndex: -1 }), false);

const strategy: SavedVisionStrategy = {
  id: "vision_sequence_test", idea: "Write a book", language: "en", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z", stepBreakdowns: {},
  strategy: { outcome: "Book completed", importance: "Creative goal", nextStep: "Create the outline", risks: [], assumptions: [], milestones: [{ title: "Draft", result: "Draft exists", steps: ["Create the outline", "Write chapter one"] }] },
};
assert.deepEqual(getVisionStepSequence(strategy), ["Create the outline", "Write chapter one"]);
assert.equal(createSequencedVisionCandidate(strategy, 0)?.id, createTodayCandidateId(strategy.id));
assert.equal(createSequencedVisionCandidate(strategy, 1)?.title, "Write chapter one");
assert.equal(createSequencedVisionCandidate(strategy, 2), null);
assert.equal(getNextVisionSequenceIndex([], strategy.id), 0);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "pending", sequenceIndex: 0 }], strategy.id), null);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "scheduled", sequenceIndex: 0 }], strategy.id), null);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "completed", sequenceIndex: 0 }], strategy.id), 1);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "dismissed", sequenceIndex: 0 }], strategy.id), null);

console.log("Today candidate contract tests passed.");
