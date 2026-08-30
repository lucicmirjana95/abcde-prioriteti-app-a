import assert from "node:assert/strict";
import type { AppADailyPlanDocument } from "../persistence/dailyPlanDocument";
import { formatHistoryDate, getInboxItems, getProgressSummary, getVisionItems } from "./planHistory";

const item = (id: string, kind: "task" | "idea" | "waiting_for", timeHorizon: "this_week" | "later" | "long_term_idea") => ({
  id, originalText: id, kind, timeHorizon, timeSensitivity: "none" as const,
  isAmbiguous: false, needsCheck: false,
  priority: { explanation: "test" },
});

const document = {
  schemaVersion: 1, localDate: "2026-08-30", timezone: "Europe/Belgrade",
  language: "sr", status: "confirmed", checkIn: {},
  plan: {
    classifiedItems: [item("wait", "waiting_for", "later"), item("idea", "idea", "long_term_idea")],
    firstFocus: [{ id: "p1" }], laterToday: [{ id: "p2" }], ifCapacityRemains: [{ id: "p3" }],
    deferredItems: [item("later", "task", "this_week"), item("wait", "waiting_for", "later")],
    longTermIdeas: [item("idea", "idea", "long_term_idea")], nonActionItems: [],
  },
  execution: { completedItemIds: ["p1", "p1", "stale"] },
} as unknown as AppADailyPlanDocument;

assert.deepEqual(getInboxItems([document]).map((entry) => entry.item.id), ["later", "wait"]);
assert.deepEqual(getVisionItems([document]).map((entry) => entry.item.id), ["idea"]);
assert.deepEqual(getProgressSummary([document]), {
  completedTasks: 1, activeDays: 1, plannedDays: 1,
  days: [{ localDate: "2026-08-30", completed: 1, total: 3 }],
});
assert.deepEqual(getProgressSummary([]), { completedTasks: 0, activeDays: 0, plannedDays: 0, days: [] });
assert.match(formatHistoryDate("2026-08-30", "sr"), /30/);
assert.equal(formatHistoryDate("not-a-date", "en"), "not-a-date");

console.log("All plan history tests passed successfully!");
