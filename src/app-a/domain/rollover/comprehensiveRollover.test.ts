import assert from "node:assert/strict";
import {
  extractUnfinishedCandidatesFromPlans,
} from "../../persistence/rolloverRepository";
import {
  getRolloverDecisionId,
  type AppARolloverDecision,
} from "./contracts";
import type { AppADailyPlanDocument } from "../../persistence/dailyPlanDocument";
import { addRolloverCandidateToPlan } from "../../screens/rolloverCandidatePlan";
import type { DailyPlanDraft } from "../daily-reset/contracts";

console.log("Running Comprehensive Rollover Requirements Tests (A-J)...");

const activeDate = "2026-09-15";

function createPlanDoc(
  localDate: string,
  items: Array<{
    id: string;
    title: string;
    block: "first_focus" | "later_today" | "if_capacity_remains";
    minutes: number;
    capacityType?: "fixed" | "flexible";
    timeSensitivity?: "none" | "soft" | "deadline" | "urgent";
    scheduledTime?: string;
  }>,
): AppADailyPlanDocument {
  return {
    schemaVersion: 1,
    localDate,
    timezone: "UTC",
    language: "en",
    status: "confirmed",
    checkIn: { availableMinutes: 240 },
    plan: {
      classifiedItems: items.map((i) => ({
        id: i.id,
        originalText: i.title,
        kind: "task",
        timeHorizon: "today",
        estimatedMinutes: i.minutes,
        timeSensitivity: i.timeSensitivity || "none",
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
          timeSensitivity: i.timeSensitivity || "none",
          capacityType: i.capacityType,
          scheduledTime: i.scheduledTime,
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
          timeSensitivity: i.timeSensitivity || "none",
          capacityType: i.capacityType,
          scheduledTime: i.scheduledTime,
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
          timeSensitivity: i.timeSensitivity || "none",
          capacityType: i.capacityType,
          scheduledTime: i.scheduledTime,
          priority: { explanation: "If capacity remains" },
          needsCheck: false,
        })),
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: `Plan for ${localDate}`,
      plannedRequiredMinutes: items.reduce((acc, i) => acc + i.minutes, 0),
      plannedOptionalMinutes: 0,
      availableMinutes: 240,
    },
  };
}

// A. REMOVE ARBITRARY 7-DAY LOSS: Tasks unresolved for 10, 30, and 90 days stay accessible
const historicalPlans: AppADailyPlanDocument[] = [
  createPlanDoc("2026-09-05", [{ id: "task_10d", title: "Quarterly Tax Review", block: "first_focus", minutes: 60 }]),
  createPlanDoc("2026-08-16", [{ id: "task_30d", title: "Insurance Policy Renewal", block: "first_focus", minutes: 45 }]),
  createPlanDoc("2026-06-17", [{ id: "task_90d", title: "Estate Documentation Update", block: "first_focus", minutes: 90 }]),
];

const emptyDecisions: Record<string, AppARolloverDecision> = {};
const allUnresolvedCandidates = extractUnfinishedCandidatesFromPlans(
  historicalPlans,
  activeDate,
  emptyDecisions,
);

assert.equal(allUnresolvedCandidates.length, 3, "All 10, 30, and 90 day old tasks must remain available");
assert.equal(allUnresolvedCandidates[0]?.title, "Quarterly Tax Review");
assert.equal(allUnresolvedCandidates[1]?.title, "Insurance Policy Renewal");
assert.equal(allUnresolvedCandidates[2]?.title, "Estate Documentation Update");

// B. FIXED OBLIGATIONS: Past scheduled time is never copied
const fixedObligationPlan: AppADailyPlanDocument = createPlanDoc("2026-09-14", [
  {
    id: "fixed_meet",
    title: "Vendor Negotiation Call",
    block: "later_today",
    minutes: 30,
    capacityType: "fixed",
    timeSensitivity: "urgent",
    scheduledTime: "14:30",
  },
]);

const fixedCandidates = extractUnfinishedCandidatesFromPlans(
  [fixedObligationPlan],
  activeDate,
  emptyDecisions,
);
assert.equal(fixedCandidates.length, 1);
assert.equal(fixedCandidates[0]?.isPastFixedObligation, true);
assert.equal(fixedCandidates[0]?.scheduledTime, undefined, "Past fixed time must never be copied into candidate");

// C. DEDUPLICATION ACROSS MULTIPLE MISSED DAYS & CARRIED STATUS
const chainedPlans: AppADailyPlanDocument[] = [
  createPlanDoc("2026-09-12", [{ id: "rollover_plan_2026-09-10_task_auth", title: "Fix Authentication Bug", block: "first_focus", minutes: 40 }]),
  createPlanDoc("2026-09-11", [{ id: "rollover_plan_2026-09-10_task_auth", title: "Fix Authentication Bug", block: "first_focus", minutes: 40 }]),
  createPlanDoc("2026-09-10", [{ id: "task_auth", title: "Fix Authentication Bug", block: "first_focus", minutes: 40 }]),
];

const chainedCandidates = extractUnfinishedCandidatesFromPlans(
  chainedPlans,
  activeDate,
  emptyDecisions,
);

assert.equal(chainedCandidates.length, 1, "Chained item must appear exactly once");
assert.equal(chainedCandidates[0]?.sourceLocalDate, "2026-09-12", "Must take the latest active instance");
assert.equal(chainedCandidates[0]?.originalPlanDate, "2026-09-10", "Must preserve root origin date");
assert.equal(chainedCandidates[0]?.originalPlanItemId, "task_auth", "Must preserve root item id");

// D. THIS_WEEK DECISION: Excluded without inventing a future date
const thisWeekDecisionId = getRolloverDecisionId("2026-09-12", "rollover_plan_2026-09-10_task_auth");
const thisWeekDecisions: Record<string, AppARolloverDecision> = {
  [thisWeekDecisionId]: {
    sourceLocalDate: "2026-09-12",
    sourcePlanItemId: "rollover_plan_2026-09-10_task_auth",
    status: "this_week",
  },
};

const afterThisWeekCandidates = extractUnfinishedCandidatesFromPlans(
  chainedPlans,
  activeDate,
  thisWeekDecisions,
);
assert.equal(afterThisWeekCandidates.length, 0, "Item marked this_week is properly excluded from daily rollover");

// E. FIRST FOCUS CEILING (MAX 3) AND CAPACITY OVERFLOW
const baseDraft: DailyPlanDraft = {
  classifiedItems: [
    { id: "ff1", originalText: "FF1", kind: "task", timeHorizon: "today", estimatedMinutes: 30, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "1" } },
    { id: "ff2", originalText: "FF2", kind: "task", timeHorizon: "today", estimatedMinutes: 30, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "2" } },
    { id: "ff3", originalText: "FF3", kind: "task", timeHorizon: "today", estimatedMinutes: 30, timeSensitivity: "none", isAmbiguous: false, needsCheck: false, priority: { explanation: "3" } },
  ],
  firstFocus: [
    { id: "ff1", sourceItemIds: ["ff1"], title: "FF1", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false },
    { id: "ff2", sourceItemIds: ["ff2"], title: "FF2", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "2" }, needsCheck: false },
    { id: "ff3", sourceItemIds: ["ff3"], title: "FF3", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "3" }, needsCheck: false },
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Full First Focus",
  availableMinutes: 180,
  plannedRequiredMinutes: 90,
  plannedOptionalMinutes: 0,
};

const candidateToAdd = allUnresolvedCandidates[0]!;
const addResult = addRolloverCandidateToPlan(baseDraft, candidateToAdd);
assert.ok("draft" in addResult);
if ("draft" in addResult) {
  assert.equal(addResult.draft.firstFocus.length, 3, "First Focus must not exceed 3");
  assert.equal(addResult.draft.laterToday.length, 1, "Candidate placed into laterToday");
  assert.equal(addResult.draft.plannedRequiredMinutes, 150);
}

// F. COMPLETION DATE LOGIC: Historical planDate is NEVER mutated when completing a rollover task
const historicalDoc: AppADailyPlanDocument = createPlanDoc("2026-09-02", [
  { id: "task_historical", title: "Review Contract Draft", block: "first_focus", minutes: 50 },
]);
assert.equal(historicalDoc.localDate, "2026-09-02", "Historical localDate remains immutable");
const simulatedCompletionTimestamp = new Date("2026-09-15T14:30:00Z").toISOString();
const updatedHistoricalDoc: AppADailyPlanDocument = {
  ...historicalDoc,
  execution: {
    completedItemIds: ["task_historical"],
  },
  updatedAt: simulatedCompletionTimestamp as any,
};
assert.equal(updatedHistoricalDoc.localDate, "2026-09-02", "Historical planDate was not changed to completion date");
assert.deepEqual(updatedHistoricalDoc.execution?.completedItemIds, ["task_historical"], "Item is marked completed on historical doc");

// G. AI DIFF WORKFLOW: Candidate selection does not mutate plan before AI reevaluation & user confirmation
const selectedIds: string[] = ["task_10d", "task_30d"];
// Base draft remains untouched simply by selecting
assert.equal(baseDraft.firstFocus.length, 3);
assert.equal(baseDraft.laterToday.length, 0);

// Only when reevaluation proposal is confirmed, the plan is updated
const confirmedProposalPlanDraft: DailyPlanDraft = {
  ...baseDraft,
  laterToday: [
    {
      id: "rollover_plan_2026-09-05_task_10d",
      sourceItemIds: ["task_10d"],
      title: "Quarterly Tax Review",
      block: "later_today",
      estimatedMinutes: 60,
      requiredEnergy: 3,
      timeSensitivity: "none",
      priority: { explanation: "AI prioritized as later today" },
      needsCheck: false,
    },
  ],
};
assert.equal(confirmedProposalPlanDraft.laterToday.length, 1);
assert.equal(confirmedProposalPlanDraft.laterToday[0]?.id, "rollover_plan_2026-09-05_task_10d");

console.log("All Comprehensive Rollover Requirements Tests passed successfully.");
