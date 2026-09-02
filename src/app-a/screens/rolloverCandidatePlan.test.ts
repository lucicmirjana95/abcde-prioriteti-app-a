import assert from "node:assert/strict";
import { addRolloverCandidateToPlan } from "./rolloverCandidatePlan";
import type { DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import type { UnfinishedRolloverCandidate } from "../domain/rollover/contracts";

console.log("Running Rollover Candidate Plan Tests...");

function createBaseDraft(): DailyPlanDraft {
  const firstFocus1: DailyPlanItem = {
    id: "item_ff_1",
    sourceItemIds: ["item_ff_1"],
    title: "Draft Design Proposal",
    block: "first_focus",
    estimatedMinutes: 30,
    requiredEnergy: 4,
    timeSensitivity: "none",
    priority: { explanation: "Important morning focus" },
    needsCheck: false,
  };

  return {
    classifiedItems: [
      {
        id: "item_ff_1",
        originalText: "Draft Design Proposal",
        kind: "task",
        timeHorizon: "today",
        estimatedMinutes: 30,
        timeSensitivity: "none",
        isAmbiguous: false,
        needsCheck: false,
        priority: { explanation: "Important" },
      },
    ],
    firstFocus: [firstFocus1],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "A clean realistic plan for the day.",
    availableMinutes: 120,
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 0,
  };
}

const candidate: UnfinishedRolloverCandidate = {
  id: "prev_plan_item_1",
  sourceLocalDate: "2026-09-01",
  title: "Review Financial Statements",
  description: "Check Q3 audit sheet",
  estimatedMinutes: 45,
  originalBlock: "first_focus",
  requiredEnergy: 3,
  timeSensitivity: "soft",
  deadlineText: "End of week",
  priority: { consequence: 4, urgency: 3, explanation: "Auditing compliance" },
  reasoning: "Must finalize before month close",
};

// 1. Successful insertion into laterToday
const initialDraft = createBaseDraft();
const result = addRolloverCandidateToPlan(initialDraft, candidate);

assert.ok("draft" in result);
if ("draft" in result) {
  const nextDraft = result.draft;
  // Placed into laterToday by default
  assert.equal(nextDraft.laterToday.length, 1);
  assert.equal(nextDraft.laterToday[0]?.title, "Review Financial Statements");
  assert.equal(nextDraft.laterToday[0]?.estimatedMinutes, 45);
  assert.equal(nextDraft.laterToday[0]?.block, "later_today");
  // Never auto-promoted to firstFocus!
  assert.equal(nextDraft.firstFocus.length, 1);
  // Planned required minutes updated
  assert.equal(nextDraft.plannedRequiredMinutes, 75); // 30 + 45
  assert.equal(nextDraft.plannedOptionalMinutes, 0);

  // 2. Duplicate prevention by exact source ID and plan ID
  const duplicateResult = addRolloverCandidateToPlan(nextDraft, candidate);
  assert.equal("error" in duplicateResult && duplicateResult.error, "duplicate");

  // 3. Duplicate prevention by normalized title
  const duplicateByTitleResult = addRolloverCandidateToPlan(nextDraft, {
    ...candidate,
    id: "different_id_same_title",
    title: "  review financial statements  ",
  });
  assert.equal("error" in duplicateByTitleResult && duplicateByTitleResult.error, "duplicate");
}

// 4. Capacity exceeded check
const tightDraft: DailyPlanDraft = {
  ...createBaseDraft(),
  availableMinutes: 60, // 30 already planned, only 30 left; candidate needs 45 min
};
const exceededResult = addRolloverCandidateToPlan(tightDraft, candidate);
assert.equal("error" in exceededResult && exceededResult.error, "capacity_exceeded");

// 5. Capacity unknown check
const unknownCapDraft: DailyPlanDraft = {
  ...createBaseDraft(),
  availableMinutes: undefined,
};
const unknownResult = addRolloverCandidateToPlan(unknownCapDraft, candidate);
assert.equal("error" in unknownResult && unknownResult.error, "capacity_unknown");

// 6. Placement in ifCapacityRemains when explicitly requested
const optionalResult = addRolloverCandidateToPlan(initialDraft, candidate, "if_capacity_remains");
assert.ok("draft" in optionalResult);
if ("draft" in optionalResult) {
  assert.equal(optionalResult.draft.ifCapacityRemains.length, 1);
  assert.equal(optionalResult.draft.ifCapacityRemains[0]?.block, "if_capacity_remains");
  assert.equal(optionalResult.draft.laterToday.length, 0);
  assert.equal(optionalResult.draft.plannedRequiredMinutes, 30);
  assert.equal(optionalResult.draft.plannedOptionalMinutes, 45);
}

// 7. Preservation of First Focus limit (max 3)
const fullFirstFocusDraft: DailyPlanDraft = {
  ...createBaseDraft(),
  firstFocus: [
    { ...createBaseDraft().firstFocus[0]!, id: "ff1" },
    { ...createBaseDraft().firstFocus[0]!, id: "ff2" },
    { ...createBaseDraft().firstFocus[0]!, id: "ff3" },
  ],
  plannedRequiredMinutes: 90,
  availableMinutes: 180,
};
assert.equal(fullFirstFocusDraft.firstFocus.length, 3);
const addedToFullDraft = addRolloverCandidateToPlan(fullFirstFocusDraft, candidate);
assert.ok("draft" in addedToFullDraft);
if ("draft" in addedToFullDraft) {
  assert.equal(addedToFullDraft.draft.firstFocus.length, 3);
  assert.equal(addedToFullDraft.draft.laterToday.length, 1);
}

// 8. Immutability of input draft
assert.equal(initialDraft.laterToday.length, 0);
assert.equal(initialDraft.plannedRequiredMinutes, 30);

console.log("Rollover Candidate Plan Tests passed successfully.");
