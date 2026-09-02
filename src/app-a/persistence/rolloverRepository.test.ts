import assert from "node:assert/strict";
import { extractUnfinishedCandidatesFromPlans } from "./rolloverRepository";
import type { AppADailyPlanDocument } from "./dailyPlanDocument";
import { getRolloverDecisionId, type AppARolloverDecision } from "../domain/rollover/contracts";

console.log("Running Rollover Repository Candidate Extraction Tests...");

function makePlanDoc(
  localDate: string,
  items: Array<{ id: string; title: string; block: "first_focus" | "later_today" | "if_capacity_remains"; minutes: number }>,
  completedItemIds: string[] = [],
): AppADailyPlanDocument {
  return {
    schemaVersion: 1,
    localDate,
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: { availableMinutes: 120 },
    plan: {
      classifiedItems: items.map((i) => ({
        id: i.id,
        originalText: i.title,
        kind: "task",
        timeHorizon: "today",
        estimatedMinutes: i.minutes,
        timeSensitivity: "none",
        isAmbiguous: false,
        needsCheck: false,
        priority: { explanation: "Standard task" },
      })),
      firstFocus: items
        .filter((i) => i.block === "first_focus")
        .map((i) => ({
          id: i.id,
          sourceItemIds: [i.id],
          title: i.title,
          block: i.block,
          estimatedMinutes: i.minutes,
          requiredEnergy: 3,
          timeSensitivity: "none",
          priority: { explanation: "First focus" },
          needsCheck: false,
        })),
      laterToday: items
        .filter((i) => i.block === "later_today")
        .map((i) => ({
          id: i.id,
          sourceItemIds: [i.id],
          title: i.title,
          block: i.block,
          estimatedMinutes: i.minutes,
          requiredEnergy: 3,
          timeSensitivity: "none",
          priority: { explanation: "Later today" },
          needsCheck: false,
        })),
      ifCapacityRemains: items
        .filter((i) => i.block === "if_capacity_remains")
        .map((i) => ({
          id: i.id,
          sourceItemIds: [i.id],
          title: i.title,
          block: i.block,
          estimatedMinutes: i.minutes,
          requiredEnergy: 3,
          timeSensitivity: "none",
          priority: { explanation: "Optional item" },
          needsCheck: false,
        })),
      deferredItems: [
        {
          id: "backlog-1",
          originalText: "Weekly backlog item",
          kind: "task",
          timeHorizon: "this_week",
          timeSensitivity: "none",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "This week" },
        },
      ],
      longTermIdeas: [
        {
          id: "idea-1",
          originalText: "SaaS idea for 2027",
          kind: "idea",
          timeHorizon: "long_term_idea",
          timeSensitivity: "none",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Idea" },
        },
      ],
      nonActionItems: [
        {
          id: "worry-1",
          originalText: "Vague worry without action",
          kind: "worry",
          timeHorizon: "no_action",
          timeSensitivity: "none",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Worry" },
        },
        {
          id: "waiting-1",
          originalText: "Waiting on supplier response",
          kind: "waiting_for",
          timeHorizon: "no_action",
          timeSensitivity: "none",
          isAmbiguous: false,
          needsCheck: false,
          priority: { explanation: "Waiting for" },
        },
      ],
      planRationale: "Test plan rationale.",
      availableMinutes: 120,
      plannedRequiredMinutes: items.filter((i) => i.block !== "if_capacity_remains").reduce((s, i) => s + i.minutes, 0),
      plannedOptionalMinutes: items.filter((i) => i.block === "if_capacity_remains").reduce((s, i) => s + i.minutes, 0),
    },
    execution: {
      completedItemIds,
    },
  };
}

const activeDate = "2026-09-02";

// 1. Setup multi-day plans
const planToday = makePlanDoc("2026-09-02", [{ id: "today-1", title: "Today Task", block: "first_focus", minutes: 30 }]);
const planYesterday = makePlanDoc(
  "2026-09-01",
  [
    { id: "yest-done", title: "Yesterday Finished Task", block: "first_focus", minutes: 30 },
    { id: "yest-unfinished-1", title: "Write API Documentation", block: "first_focus", minutes: 45 },
    { id: "yest-unfinished-2", title: "Fix Database Migration", block: "later_today", minutes: 20 },
    { id: "yest-optional", title: "Clean Desktop Files", block: "if_capacity_remains", minutes: 15 },
  ],
  ["yest-done"], // 'yest-done' marked complete
);
const plan3DaysAgo = makePlanDoc(
  "2026-08-30",
  [{ id: "day3-unfinished", title: "Send Invoices to Accounting", block: "later_today", minutes: 25 }],
  [],
);
const plan7DaysAgo = makePlanDoc(
  "2026-08-26",
  [{ id: "day7-unfinished", title: "Boundary Check Task", block: "later_today", minutes: 15 }],
  [],
);
const plan8DaysAgo = makePlanDoc(
  "2026-08-25",
  [{ id: "day8-expired", title: "Old Task Outside 7-Day Window", block: "later_today", minutes: 60 }],
  [],
);

const allPlans = [planToday, planYesterday, plan3DaysAgo, plan7DaysAgo, plan8DaysAgo];
const decisions: Record<string, AppARolloverDecision> = {};

// 2. Candidate extraction with lookback and boundary checking
const candidates = extractUnfinishedCandidatesFromPlans(allPlans, activeDate, decisions);

// Plan from today (2026-09-02) MUST NOT be in rollover candidates
assert.ok(!candidates.some((c) => c.sourceLocalDate === "2026-09-02"));

// Plan from 8 days ago (2026-08-25) MUST NOT be in candidates (strictly bounded to 7 calendar days)
assert.ok(!candidates.some((c) => c.sourceLocalDate === "2026-08-25"));

// Completed tasks MUST NOT be in candidates
assert.ok(!candidates.some((c) => c.id === "yest-done"));

// Non-actionable items, backlog items, long-term ideas MUST NOT be in candidates
assert.ok(!candidates.some((c) => c.id === "backlog-1"));
assert.ok(!candidates.some((c) => c.id === "idea-1"));
assert.ok(!candidates.some((c) => c.id === "worry-1"));
assert.ok(!candidates.some((c) => c.id === "waiting-1"));

// Unfinished tasks from 2026-09-01, 2026-08-30, and 2026-08-26 MUST be present
assert.equal(candidates.length, 5); // 3 from yesterday, 1 from 3-days-ago, 1 from 7-days-ago

// 3. Newest-first ordering verification
assert.equal(candidates[0]?.sourceLocalDate, "2026-09-01");
assert.equal(candidates[0]?.id, "yest-unfinished-1");
assert.equal(candidates[1]?.sourceLocalDate, "2026-09-01");
assert.equal(candidates[2]?.sourceLocalDate, "2026-09-01");
assert.equal(candidates[3]?.sourceLocalDate, "2026-08-30");
assert.equal(candidates[4]?.sourceLocalDate, "2026-08-26");

// 4. Verification with decisions (dismissed, carried, snoozed)
const updatedDecisions: Record<string, AppARolloverDecision> = {
  [getRolloverDecisionId("2026-09-01", "yest-unfinished-1")]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "yest-unfinished-1",
    status: "carried",
  },
  [getRolloverDecisionId("2026-09-01", "yest-optional")]: {
    sourceLocalDate: "2026-09-01",
    sourcePlanItemId: "yest-optional",
    status: "dismissed",
  },
  [getRolloverDecisionId("2026-08-30", "day3-unfinished")]: {
    sourceLocalDate: "2026-08-30",
    sourcePlanItemId: "day3-unfinished",
    status: "snoozed",
    snoozedUntilLocalDate: "2026-09-05", // snoozed for future
  },
};

const filteredCandidates = extractUnfinishedCandidatesFromPlans(allPlans, activeDate, updatedDecisions);
assert.equal(filteredCandidates.length, 2);
assert.equal(filteredCandidates[0]?.id, "yest-unfinished-2");
assert.equal(filteredCandidates[1]?.id, "day7-unfinished");

// 5. Timezone transition near midnight (e.g. crossing midnight to 2026-09-03)
const nextActiveDate = "2026-09-03";
const midnightCandidates = extractUnfinishedCandidatesFromPlans(allPlans, nextActiveDate, decisions);
// Now 2026-09-02 becomes eligible as a previous day
assert.ok(midnightCandidates.some((c) => c.sourceLocalDate === "2026-09-02" && c.id === "today-1"));
// And 2026-08-26 is now 8 days prior relative to 2026-09-03, so it is cleanly excluded!
assert.ok(!midnightCandidates.some((c) => c.sourceLocalDate === "2026-08-26"));

console.log("Rollover Repository Candidate Extraction Tests passed successfully.");
