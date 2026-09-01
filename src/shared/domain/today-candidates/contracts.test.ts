import assert from "node:assert/strict";
import { isTodayCandidate, type TodayCandidate } from "./contracts";

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
assert.equal(isTodayCandidate({ ...candidate, status: "scheduled" }), false);
assert.equal(isTodayCandidate({ ...candidate, source: "unknown" }), false);

console.log("Today candidate contract tests passed.");
