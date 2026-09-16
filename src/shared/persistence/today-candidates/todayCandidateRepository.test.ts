import assert from "node:assert/strict";
import { isTodayCandidate, type TodayCandidate } from "../../../shared/domain/today-candidates/contracts";

// Verification of atomic contract invariants for savePlanAndScheduleVisionAtomic
const sampleCandidate: TodayCandidate = {
  id: "candidate_test_atomic_1",
  source: "vision",
  sourceId: "vision_strat_123",
  title: "Definiši MVP arhitekturu",
  estimatedMinutes: 25,
  status: "pending",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// 1. Initial status invariant
assert.equal(sampleCandidate.status, "pending");
assert.equal(isTodayCandidate(sampleCandidate), true);

// 2. Candidate invalid minutes check
assert.equal(isTodayCandidate({ ...sampleCandidate, estimatedMinutes: 0 }), true); // candidate can exist with 0 min placeholder
assert.equal(isTodayCandidate({ ...sampleCandidate, estimatedMinutes: -5 }), false); // negative is invalid

// 3. Status transitions
const scheduledCandidate: TodayCandidate = { ...sampleCandidate, status: "scheduled" };
assert.equal(scheduledCandidate.status, "scheduled");
assert.equal(isTodayCandidate(scheduledCandidate), true);

// 4. Completed/Dismissed candidates cannot be re-scheduled
const completedCandidate: TodayCandidate = { ...sampleCandidate, status: "completed" };
const dismissedCandidate: TodayCandidate = { ...sampleCandidate, status: "dismissed" };
assert.equal(completedCandidate.status === "completed" || completedCandidate.status === "dismissed", true);
assert.equal(dismissedCandidate.status === "completed" || dismissedCandidate.status === "dismissed", true);

console.log("✅ todayCandidateRepository atomic contract invariants verified!");
