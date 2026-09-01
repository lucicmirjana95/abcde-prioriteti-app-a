import assert from "node:assert/strict";
import { addVisionCandidateToPlan } from "./visionCandidatePlan";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { TodayCandidate } from "../../shared/domain/today-candidates";

const draft: DailyPlanDraft = { classifiedItems: [], firstFocus: [], laterToday: [], ifCapacityRemains: [], deferredItems: [], longTermIdeas: [], nonActionItems: [], planRationale: "A bounded plan.", availableMinutes: 60, plannedRequiredMinutes: 0, plannedOptionalMinutes: 0 };
const candidate: TodayCandidate = { id: "candidate_vision_test", source: "vision", sourceId: "vision_test", title: "Write the first outline page", estimatedMinutes: 25, status: "pending", createdAt: "2026-09-01T10:00:00.000Z", updatedAt: "2026-09-01T10:00:00.000Z" };
const added = addVisionCandidateToPlan(draft, candidate);
assert.ok("draft" in added);
if ("draft" in added) {
  assert.equal(added.draft.laterToday.length, 1);
  assert.equal(added.draft.plannedRequiredMinutes, 25);
  assert.equal(addVisionCandidateToPlan(added.draft, candidate).error, "duplicate");
}
assert.equal(addVisionCandidateToPlan({ ...draft, availableMinutes: 20 }, candidate).error, "capacity_exceeded");
assert.equal(addVisionCandidateToPlan({ ...draft, availableMinutes: undefined }, candidate).error, "capacity_unknown");
assert.equal(draft.laterToday.length, 0);
console.log("Vision candidate plan tests passed.");
