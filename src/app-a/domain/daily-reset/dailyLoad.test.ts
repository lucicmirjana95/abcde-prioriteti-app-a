import assert from "node:assert/strict";
import type { DailyPlanDraft } from "./contracts";
import { assessDailyLoad } from "./dailyLoad";

const item = (id: string, minutes: number, capacityType: "flexible" | "fixed" = "flexible", block: "later_today" | "if_capacity_remains" = "later_today") => ({ id, sourceItemIds: [id], title: id, block, estimatedMinutes: minutes, capacityType, requiredEnergy: 3 as const, timeSensitivity: "none" as const, priority: { consequence: 1 as const, urgency: 1 as const, explanation: "" }, needsCheck: false });
const draft: DailyPlanDraft = { classifiedItems: [], firstFocus: [], laterToday: [item("appointment", 720, "fixed"), item("deep work", 300)], ifCapacityRemains: [item("optional", 120, "flexible", "if_capacity_remains")], deferredItems: [], longTermIdeas: [], nonActionItems: [], planRationale: "", availableMinutes: 30, plannedRequiredMinutes: 1020, plannedOptionalMinutes: 120 };
const assessment = assessDailyLoad(draft);
assert.equal(assessment.overloaded, true);
assert.equal(assessment.fixedMinutes, 720);
assert.ok(assessment.suggestedMoves.some((entry) => entry.id === "optional"));
console.log("Daily load tests passed.");
