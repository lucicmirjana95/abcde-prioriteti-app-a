import assert from "node:assert/strict";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { addInboxItemToPlan } from "./inboxCandidatePlan";

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
const unknownCapacity = addInboxItemToPlan({ ...draft, availableMinutes: undefined }, item);
const exceededCapacity = addInboxItemToPlan({ ...draft, availableMinutes: 10 }, item);
assert.equal("error" in missingDuration && missingDuration.error, "duration_required");
assert.equal("error" in unknownCapacity && unknownCapacity.error, "capacity_unknown");
assert.equal("error" in exceededCapacity && exceededCapacity.error, "capacity_exceeded");

console.log("Inbox candidate plan tests passed.");
