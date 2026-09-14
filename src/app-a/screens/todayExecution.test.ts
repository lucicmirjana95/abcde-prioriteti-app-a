import assert from "node:assert/strict";
import type { DailyPlanDraft } from "../domain/daily-reset/contracts";
import {
  getTodayPlanItemIds,
  normalizeCompletedItemIds,
  toggleCompletedItemId,
} from "./todayExecution";

const item = (id: string, block: "first_focus" | "later_today" | "if_capacity_remains") => ({
  id,
  sourceItemIds: [`source-${id}`],
  title: id,
  block,
  estimatedMinutes: 10,
  requiredEnergy: 2 as const,
  timeSensitivity: "none" as const,
  priority: { explanation: "test" },
  needsCheck: false,
});

const draft: DailyPlanDraft = {
  classifiedItems: [],
  firstFocus: [item("a", "first_focus")],
  laterToday: [item("b", "later_today")],
  ifCapacityRemains: [item("c", "if_capacity_remains")],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "test",
  plannedRequiredMinutes: 20,
  plannedOptionalMinutes: 10,
};

assert.deepEqual(getTodayPlanItemIds(draft), ["a", "b", "c"]);
assert.deepEqual(normalizeCompletedItemIds(draft, ["a", "a", "missing", "c"]), ["a", "c"]);
assert.deepEqual(toggleCompletedItemId(draft, [], "a"), ["a"]);
assert.deepEqual(toggleCompletedItemId(draft, ["a"], "a"), []);
assert.deepEqual(toggleCompletedItemId(draft, ["a"], "missing"), ["a"]);

console.log("All Today execution state tests passed.");
