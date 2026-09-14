import assert from "node:assert/strict";
import type { DailyPlanDraft, SafeIntervention } from "../domain/daily-reset/contracts";

// Simulated localStorage for test runner Node environment
const mockStorage: Record<string, string> = {};
globalThis.localStorage = {
  getItem: (key: string) => mockStorage[key] || null,
  setItem: (key: string, value: string) => { mockStorage[key] = value; },
  removeItem: (key: string) => { delete mockStorage[key]; },
  clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  length: 0,
  key: () => null,
};

function isInterventionRelevant(
  draft: DailyPlanDraft,
  completedItemIds: string[],
  isDismissed: boolean
): boolean {
  if (!draft.intervention || isDismissed) return false;
  const intervention = draft.intervention;

  const todayItems = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains];

  if (intervention.targetTaskId) {
    const targetTask = todayItems.find((i) => i.id === intervention.targetTaskId);
    if (!targetTask) return false; // Task removed or deferred outside today
    if (completedItemIds.includes(targetTask.id)) return false; // Task is finished
  }

  const allDone = todayItems.length > 0 && completedItemIds.length === todayItems.length;
  if (allDone && (intervention.type === "environment" || intervention.type === "focus")) {
    return false; // All today items finished
  }

  return true;
}

const localDate = "2026-09-10";

const sampleIntervention: SafeIntervention = {
  type: "environment",
  title: "Postavljanje okruženja za čitanje",
  description: "Pripremite radni prostor pre čitanja.",
  estimatedMinutes: 5,
  reason: "Smanjenje kognitivnog opterećenja",
  targetTaskId: "task-read-1",
};

const item = (id: string) => ({
  id,
  sourceItemIds: [`source-${id}`],
  title: `Task ${id}`,
  block: "first_focus" as const,
  estimatedMinutes: 15,
  requiredEnergy: 2 as const,
  timeSensitivity: "none" as const,
  priority: { explanation: "test" },
  needsCheck: false,
});

const draft: DailyPlanDraft = {
  localDate,
  classifiedItems: [],
  firstFocus: [item("task-read-1"), item("task-code-2")],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "test",
  plannedRequiredMinutes: 30,
  plannedOptionalMinutes: 0,
  intervention: sampleIntervention,
};

// 1. Initial state: task-read-1 is active -> intervention is relevant
assert.equal(isInterventionRelevant(draft, [], false), true, "Active task intervention should be relevant");

// 2. Linked task completed -> intervention is no longer relevant
assert.equal(isInterventionRelevant(draft, ["task-read-1"], false), false, "Completed task intervention should NOT be relevant");

// 3. Dismissal persistence test
const key = `app_a_dismissed_interventions_${localDate}`;
localStorage.setItem(key, JSON.stringify([sampleIntervention.title]));
const isDismissedFromStorage = JSON.parse(localStorage.getItem(key) || "[]").includes(sampleIntervention.title);
assert.equal(isDismissedFromStorage, true, "Intervention title should be recorded in storage");
assert.equal(isInterventionRelevant(draft, [], isDismissedFromStorage), false, "Dismissed intervention should NOT be relevant");

// 4. Task removed from today plan -> intervention is not relevant
const draftWithoutTask: DailyPlanDraft = {
  ...draft,
  firstFocus: [item("task-code-2")],
};
assert.equal(isInterventionRelevant(draftWithoutTask, [], false), false, "Intervention for removed task should NOT be relevant");

// 5. All tasks completed -> environment intervention not relevant
assert.equal(isInterventionRelevant(draft, ["task-read-1", "task-code-2"], false), false, "All tasks completed should hide environment intervention");

console.log("All intervention relevance & dismissal persistence tests passed!");
