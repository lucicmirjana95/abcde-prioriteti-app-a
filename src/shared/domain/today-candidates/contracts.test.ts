import assert from "node:assert/strict";
import { createSequencedVisionCandidate, createTodayCandidateId, estimateVisionStepMinutes, getNextVisionSequenceIndex, getVisionStepSequence, isTodayCandidate, nextVisionCandidate, shouldSurfaceSecondaryVision, visionStepKey, type TodayCandidate } from "./contracts";
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
assert.equal(isTodayCandidate({ ...candidate, sourceTitle: "Write a book" }), true);
assert.equal(isTodayCandidate({ ...candidate, sourceTitle: "" }), false);
assert.equal(isTodayCandidate({ ...candidate, estimatedMinutes: 0 }), true, 'A suggestion may have unknown duration; scheduling must require a positive duration');
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
assert.equal(createSequencedVisionCandidate(strategy, 0)?.id, createTodayCandidateId(`${strategy.id}_${visionStepKey('Create the outline')}`));
assert.equal(createSequencedVisionCandidate(strategy, 0)?.estimatedMinutes, 20);
assert.equal(createSequencedVisionCandidate(strategy, 1)?.title, "Write chapter one");
assert.equal(createSequencedVisionCandidate(strategy, 1)?.estimatedMinutes, 20, "Neutral fallback when no existing or AI estimate is present");
assert.equal(createSequencedVisionCandidate(strategy, 1, undefined, 45)?.estimatedMinutes, 45, "Respects existing/explicit minutes");
assert.equal(createSequencedVisionCandidate(strategy, 2), null);

// Verification of estimateVisionStepMinutes priority rules:
// 1. Existing valid estimatedMinutes takes highest priority
assert.equal(estimateVisionStepMinutes({ existingMinutes: 45 }), 45);
assert.equal(estimateVisionStepMinutes({ existingMinutes: 30, aiEstimatedMinutes: 15 }), 30);
assert.equal(estimateVisionStepMinutes(25), 25);
// 2. AI-produced estimate used when existing is missing/invalid
assert.equal(estimateVisionStepMinutes({ aiEstimatedMinutes: 15 }), 15);
assert.equal(estimateVisionStepMinutes({ existingMinutes: null, aiEstimatedMinutes: 25 }), 25);
assert.equal(estimateVisionStepMinutes({ existingMinutes: 0, aiEstimatedMinutes: 25 }), 25);
assert.equal(estimateVisionStepMinutes(null, 35), 35);
// 3. Fallback to neutral 20 minutes when no estimate is available
assert.equal(estimateVisionStepMinutes(), 20);
assert.equal(estimateVisionStepMinutes({ existingMinutes: null, aiEstimatedMinutes: null }), 20);
assert.equal(estimateVisionStepMinutes({ existingMinutes: -1, aiEstimatedMinutes: 0 }), 20);
// 4. No keyword heuristics on title text (titles with 'pozovi', 'napiši', 'draft', 'call' etc. return neutral fallback 20)
assert.equal(estimateVisionStepMinutes("Napiši kod i istraži arhivu"), 20);
assert.equal(estimateVisionStepMinutes("Pozovi klijenta i pošalji email"), 20);
assert.equal(estimateVisionStepMinutes({ title: "Draft new project architecture" }), 20);
assert.equal(getNextVisionSequenceIndex([], strategy.id), 0);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "pending", sequenceIndex: 0 }], strategy.id), null);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "scheduled", sequenceIndex: 0 }], strategy.id), null);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "completed", sequenceIndex: 0 }], strategy.id), 1);
assert.equal(getNextVisionSequenceIndex([{ ...candidate, sourceId: strategy.id, status: "dismissed", sequenceIndex: 0 }], strategy.id), 1);

const brokenDown = { ...strategy, stepBreakdowns: { 'm0-s0': ['List the chapters', 'Write a summary for each chapter'], 'm0-s0-d0': ['Identify the main topics', 'Order the chapter topics'] } };
assert.deepEqual(getVisionStepSequence(brokenDown), ['Identify the main topics', 'Order the chapter topics', 'Write a summary for each chapter', 'Write chapter one']);
const first = nextVisionCandidate(brokenDown, [])!;
assert.equal(nextVisionCandidate(brokenDown, [first]), null);
assert.equal(nextVisionCandidate(brokenDown, [{ ...first, status: 'dismissed' }])?.title, 'Order the chapter topics');
assert.equal(nextVisionCandidate({ ...brokenDown, status: 'archived' }, []), null);

assert.equal(shouldSurfaceSecondaryVision("", "2026-09-10"), false);
assert.equal(shouldSurfaceSecondaryVision("user-1", "invalid"), false);
const secondaryCadence = ["2026-09-10", "2026-09-11", "2026-09-12"].map(date => shouldSurfaceSecondaryVision("user-1", date));
assert.equal(secondaryCadence.filter(Boolean).length, 1, "A secondary Vision is offered on exactly one of every three consecutive local dates");
assert.equal(shouldSurfaceSecondaryVision("user-1", "2026-09-10"), shouldSurfaceSecondaryVision("user-1", "2026-09-10"), "The cadence is stable across rerenders");

console.log("Today candidate contract tests passed.");
