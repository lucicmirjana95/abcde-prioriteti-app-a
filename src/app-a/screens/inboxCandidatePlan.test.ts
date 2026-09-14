import assert from "node:assert/strict";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { addInboxItemToPlan, getInboxPlanningMinutes } from "./inboxCandidatePlan";

const draft: DailyPlanDraft = {
  classifiedItems: [],
  firstFocus: [],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "A realistic plan.",
  availableMinutes: 60,
  plannedRequiredMinutes: 0,
  plannedOptionalMinutes: 0,
};
const item: AppAInboxItem = {
  id: "in_manual_test",
  title: "Call the dentist",
  kind: "task",
  horizon: "this_week",
  status: "inbox",
  estimatedMinutes: 20,
  source: "manual",
  language: "en",
  createdAt: "2026-09-02T12:00:00.000Z",
  updatedAt: "2026-09-02T12:00:00.000Z",
};

const added = addInboxItemToPlan(draft, item);
assert.equal("draft" in added, true);
if ("draft" in added) {
  assert.equal(added.draft.firstFocus.length, 0);
  assert.equal(added.draft.laterToday.length, 1);
  assert.equal(added.draft.plannedRequiredMinutes, 20);
  const duplicate = addInboxItemToPlan(added.draft, item);
  assert.equal("error" in duplicate && duplicate.error, "duplicate");
}
const missingDuration = addInboxItemToPlan(draft, { ...item, estimatedMinutes: undefined });
assert.equal(getInboxPlanningMinutes({ ...item, estimatedMinutes: undefined }), 20);
assert.equal(getInboxPlanningMinutes({ ...item, estimatedMinutes: 45 }), 45);
const unknownCapacity = addInboxItemToPlan({ ...draft, availableMinutes: undefined }, item);
const exceededCapacity = addInboxItemToPlan({ ...draft, availableMinutes: 10 }, item);
assert.equal("draft" in missingDuration && missingDuration.draft.laterToday[0].estimatedMinutes, 20);
assert.equal("draft" in unknownCapacity && unknownCapacity.draft.ifCapacityRemains.length, 1);
assert.equal("draft" in exceededCapacity && exceededCapacity.draft.ifCapacityRemains.length, 1);

const fixed = addInboxItemToPlan({ ...draft, availableMinutes: 10 }, { ...item, id: "in_fixed", capacityType: "fixed", estimatedMinutes: 90 });
assert.equal("draft" in fixed, true, "Fixed commitments do not consume flexible capacity");
if ("draft" in fixed) {
  assert.equal(fixed.draft.laterToday[0].capacityType, "fixed");
  assert.equal(fixed.draft.plannedFixedMinutes, 90);
}

const urgent = addInboxItemToPlan({ ...draft, firstFocus: [{ id: "existing", sourceItemIds: ["existing"], title: "Routine review", block: "first_focus", estimatedMinutes: 20, requiredEnergy: 3, timeSensitivity: "none", priority: { consequence: 1, urgency: 1, goalContribution: 1, explanation: "" }, needsCheck: false }], classifiedItems: [{ id: "existing", originalText: "Routine review", kind: "task", timeHorizon: "today", timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "" } }] }, { ...item, id: "in_urgent", title: "Emergency call", estimatedMinutes: 20 }, { reconsiderPriorities: true, completedItemIds: [] });
assert.equal("draft" in urgent, true, "Urgent addition should produce a reviewed proposal");
if ("draft" in urgent) assert.ok(urgent.changes.firstFocus.includes("Emergency call"));

console.log("Inbox candidate plan tests passed.");
