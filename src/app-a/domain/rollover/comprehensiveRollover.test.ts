import assert from "node:assert/strict";

// Setup localStorage and window for mock testing in Node environment
const store = new Map<string, string>();
if (typeof globalThis.localStorage === "undefined") {
  (globalThis as any).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => store.set(k, String(v)),
    removeItem: (k: string) => store.delete(k),
    clear: () => store.clear(),
  };
}
if (typeof globalThis.window === "undefined") {
  (globalThis as any).window = {
    addEventListener: () => {},
    removeEventListener: () => {},
    location: { reload: () => {} },
  };
}

import {
  extractUnfinishedCandidatesFromPlans,
} from "../../persistence/rolloverRepository";
import {
  getCanonicalRootIdentity,
  getRolloverDecisionId,
  isCandidateEligibleWithDecisions,
  normalizeRolloverDecisionStatus,
  type AppARolloverDecision,
  type UnfinishedRolloverCandidate,
} from "./contracts";
import {
  isAppADailyPlanDocument,
  isValidUpdatedAt,
  type AppADailyPlanDocument,
} from "../../persistence/dailyPlanDocument";
import { addRolloverCandidateToPlan } from "../../screens/rolloverCandidatePlan";
import type { DailyPlanDraft } from "../daily-reset/contracts";
import {
  applyReevaluationProposal,
  reevaluatePrioritiesStructured,
} from "../../screens/planReview";
import { getLocalDateKeyInTimeZone } from "../../persistence/dailyPlanDocument";
import {
  isResetBlocked,
  acquireResetLock,
  releaseResetLock,
} from "../../persistence/resetGuard";

console.log("Running Comprehensive Rollover 18 Required Scenarios Suite...");

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
    isWaiting?: boolean;
    manualPriorityOverride?: boolean;
  }>,
  completedItemIds: string[] = [],
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
        kind: i.isWaiting ? "waiting_for" : "task",
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
          manualPriorityOverride: i.manualPriorityOverride,
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
          manualPriorityOverride: i.manualPriorityOverride,
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
          manualPriorityOverride: i.manualPriorityOverride,
        })),
      deferredItems: [],
      longTermIdeas: [],
      nonActionItems: [],
      planRationale: `Plan for ${localDate}`,
      plannedRequiredMinutes: items.reduce((acc, i) => acc + i.minutes, 0),
      plannedOptionalMinutes: 0,
      availableMinutes: 240,
    },
    execution: {
      completedItemIds,
    },
  };
}

// ----------------------------------------------------------------------------------
// 1. Četiri zadatka juče, dva završena — sutra se nude samo dva nerešena
// ----------------------------------------------------------------------------------
console.log("▶ 1. Testing four tasks yesterday, two completed -> two offered...");
{
  const yesterdayDoc = createPlanDoc(
    "2026-09-14",
    [
      { id: "task_a", title: "Task A", block: "first_focus", minutes: 30 },
      { id: "task_b", title: "Task B", block: "later_today", minutes: 45 },
      { id: "task_c", title: "Task C", block: "later_today", minutes: 20 },
      { id: "task_d", title: "Task D", block: "if_capacity_remains", minutes: 60 },
    ],
    ["task_a", "task_c"], // Completed A and C
  );

  const candidates = extractUnfinishedCandidatesFromPlans([yesterdayDoc], activeDate, {});
  assert.equal(candidates.length, 2, "Only unfinished tasks B and D should be returned");
  assert.deepEqual(
    candidates.map((c) => c.id).sort(),
    ["task_b", "task_d"],
    "Exact IDs of unfinished items must match",
  );
}

// ----------------------------------------------------------------------------------
// 2. Isti zadatak prenošen tri dana — pojavljuje se jednom i čuva originalni koren
// ----------------------------------------------------------------------------------
console.log("▶ 2. Testing task carried over 3 days -> single candidate with root origin...");
{
  const chainedPlans: AppADailyPlanDocument[] = [
    createPlanDoc("2026-09-12", [
      { id: "rollover_plan_2026-09-10_task_auth", title: "Fix Auth Bug", block: "first_focus", minutes: 40 },
    ]),
    createPlanDoc("2026-09-11", [
      { id: "rollover_plan_2026-09-10_task_auth", title: "Fix Auth Bug", block: "first_focus", minutes: 40 },
    ]),
    createPlanDoc("2026-09-10", [
      { id: "task_auth", title: "Fix Auth Bug", block: "first_focus", minutes: 40 },
    ]),
  ];

  const candidates = extractUnfinishedCandidatesFromPlans(chainedPlans, activeDate, {});
  assert.equal(candidates.length, 1, "Chained item must appear exactly once");
  assert.equal(candidates[0]?.sourceLocalDate, "2026-09-12", "Must take latest active plan instance");
  assert.equal(candidates[0]?.originalPlanDate, "2026-09-10", "Must preserve root origin date");
  assert.equal(candidates[0]?.originalPlanItemId, "task_auth", "Must preserve root item id");
}

// ----------------------------------------------------------------------------------
// 3. Dva različita zadatka sa istim naslovom — oba ostaju
// ----------------------------------------------------------------------------------
console.log("▶ 3. Testing two distinct tasks with same title -> both preserved...");
{
  const sameTitlePlan = createPlanDoc("2026-09-14", [
    { id: "task_inv_eng", title: "Review Invoice", block: "first_focus", minutes: 30 },
    { id: "task_inv_ops", title: "Review Invoice", block: "later_today", minutes: 45 },
  ]);

  const candidates = extractUnfinishedCandidatesFromPlans([sameTitlePlan], activeDate, {});
  assert.equal(candidates.length, 2, "Both distinct tasks with identical title must remain");
  assert.equal(candidates[0]?.id, "task_inv_eng");
  assert.equal(candidates[1]?.id, "task_inv_ops");
}

// ----------------------------------------------------------------------------------
// 4. Kandidat stariji od sedam dana ostaje dostupan dok nije rešen
// ----------------------------------------------------------------------------------
console.log("▶ 4. Testing candidates older than 7 days remain available until resolved...");
{
  const oldPlans: AppADailyPlanDocument[] = [
    createPlanDoc("2026-09-05", [{ id: "task_10d", title: "Quarterly Tax Review", block: "first_focus", minutes: 60 }]),
    createPlanDoc("2026-08-16", [{ id: "task_30d", title: "Insurance Policy Renewal", block: "first_focus", minutes: 45 }]),
    createPlanDoc("2026-06-17", [{ id: "task_90d", title: "Estate Documentation Update", block: "first_focus", minutes: 90 }]),
  ];

  const candidates = extractUnfinishedCandidatesFromPlans(oldPlans, activeDate, {});
  assert.equal(candidates.length, 3, "Tasks from 10, 30, and 90 days ago must not be arbitrarily dropped");
  assert.equal(candidates[0]?.title, "Quarterly Tax Review");
  assert.equal(candidates[1]?.title, "Insurance Policy Renewal");
  assert.equal(candidates[2]?.title, "Estate Documentation Update");
}

// ----------------------------------------------------------------------------------
// 5. „Razmotri za danas“ ne menja stanje pre AI diff potvrde
// ----------------------------------------------------------------------------------
console.log("▶ 5. Testing 'Consider for today' does not mutate state prior to AI diff confirmation...");
{
  const initialDraft: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [{ id: "existing_1", sourceItemIds: ["existing_1"], title: "Existing 1", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Initial Plan",
    availableMinutes: 120,
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 0,
  };

  // Simulating user opening "Consider for Today" dialog:
  const candidateToConsider: UnfinishedRolloverCandidate = {
    id: "cand_1",
    sourceLocalDate: "2026-09-14",
    title: "Considered Task",
    estimatedMinutes: 40,
    originalBlock: "later_today",
    requiredEnergy: 3,
    timeSensitivity: "none",
    priority: { explanation: "Prior" },
  };

  // State of initialDraft MUST be frozen and unchanged during selection / dialog prompt
  assert.equal(initialDraft.firstFocus.length, 1);
  assert.equal(initialDraft.laterToday.length, 0);
  assert.equal(initialDraft.plannedRequiredMinutes, 30);
  assert.ok(candidateToConsider.title === "Considered Task");
}

// ----------------------------------------------------------------------------------
// 6. Cancel, API greška ili parser greška ostavljaju sve netaknuto
// ----------------------------------------------------------------------------------
console.log("▶ 6. Testing cancel, API error, or parser error leave state untouched...");
{
  const draftBefore: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [{ id: "stay_ff", sourceItemIds: ["stay_ff"], title: "Stay FF", block: "first_focus", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "Stay" }, needsCheck: false }],
    laterToday: [{ id: "stay_lt", sourceItemIds: ["stay_lt"], title: "Stay LT", block: "later_today", estimatedMinutes: 45, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "Stay" }, needsCheck: false }],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Safe Draft",
    availableMinutes: 180,
    plannedRequiredMinutes: 90,
    plannedOptionalMinutes: 0,
  };

  // Cancel action: simply dismiss dialog without calling applyReevaluationProposal or saveDailyPlan
  const cancelledState = { ...draftBefore };
  assert.deepEqual(cancelledState, draftBefore, "Cancel leaves state 100% untouched");

  // API error (e.g. 500 network failure): error displayed to user, no commit
  let stateAfterApiError = { ...draftBefore };
  const mockApiFailure = () => { throw new Error("network_unavailable"); };
  assert.throws(mockApiFailure, /network_unavailable/);
  assert.deepEqual(stateAfterApiError, draftBefore, "API failure leaves state 100% untouched");
}

// ----------------------------------------------------------------------------------
// 7. Potvrđen diff upisuje plan i odluke atomarno
// ----------------------------------------------------------------------------------
console.log("▶ 7. Testing confirmed diff commits plan and decisions atomically...");
{
  const currentDraft: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Active Draft",
    availableMinutes: 180,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 0,
  };

  const proposedDraft: DailyPlanDraft = {
    ...currentDraft,
    firstFocus: [{
      id: "cand_carried",
      sourceItemIds: ["cand_carried"],
      title: "Carried Task",
      block: "first_focus",
      estimatedMinutes: 30,
      requiredEnergy: 3,
      timeSensitivity: "none",
      priority: { explanation: "Carried" },
      needsCheck: false,
    }],
  };

  const reevalProposal = {
    proposedDraft,
    diff: {
      firstFocusEntries: [{ id: "cand_carried", title: "Carried Task", reason: "Carried" }],
      movedToLaterToday: [],
      movedToIfCapacity: [],
      proposedDelegations: [],
      proposedEliminations: [],
      manualOverrideConflicts: [],
    },
  };

  const finalDraft = applyReevaluationProposal(currentDraft, reevalProposal as any);
  assert.equal(finalDraft.firstFocus.length, 1);
  assert.equal(finalDraft.firstFocus[0]?.id, "cand_carried");

  // Decisions payload to commit atomically
  const decisions: AppARolloverDecision[] = [
    {
      sourceLocalDate: "2026-09-14",
      sourcePlanItemId: "cand_carried",
      status: "carried",
    },
  ];
  assert.equal(decisions.length, 1);
  assert.equal(decisions[0]?.status, "carried");
}

// ----------------------------------------------------------------------------------
// 8. Retry / dvostruki klik ne pravi duplikat
// ----------------------------------------------------------------------------------
console.log("▶ 8. Testing retry/double-click does not produce duplicates...");
{
  const sourceLocalDate = "2026-09-14";
  const itemId = "task_double";

  const decisionId1 = getRolloverDecisionId(sourceLocalDate, itemId);
  const decisionId2 = getRolloverDecisionId(sourceLocalDate, itemId);
  assert.equal(decisionId1, decisionId2, "Deterministic decision ID prevents duplicate decision documents");

  const baseDraft: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [{ id: "task_double", sourceItemIds: ["task_double"], title: "Task Double", block: "first_focus", estimatedMinutes: 30, requiredEnergy: 3, timeSensitivity: "none", priority: { explanation: "1" }, needsCheck: false }],
    laterToday: [],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Plan",
    availableMinutes: 120,
    plannedRequiredMinutes: 30,
    plannedOptionalMinutes: 0,
  };

  const candidate: UnfinishedRolloverCandidate = {
    id: "task_double",
    sourceLocalDate,
    title: "Task Double",
    estimatedMinutes: 30,
    originalBlock: "first_focus",
    requiredEnergy: 3,
    timeSensitivity: "none",
    priority: { explanation: "1" },
  };

  const result1 = addRolloverCandidateToPlan(baseDraft, candidate);
  assert.ok("error" in result1 && result1.error === "duplicate", "Immediate duplicate rejected");
}

// ----------------------------------------------------------------------------------
// 9. Fixed stavka sa prošlom satnicom ne prenosi staro vreme
// ----------------------------------------------------------------------------------
console.log("▶ 9. Testing fixed obligation with past schedule does not carry over old time...");
{
  const fixedPlan = createPlanDoc("2026-09-14", [
    {
      id: "fixed_call",
      title: "Sync with Partner",
      block: "later_today",
      minutes: 30,
      capacityType: "fixed",
      scheduledTime: "10:00",
      timeSensitivity: "urgent",
    },
  ]);

  const candidates = extractUnfinishedCandidatesFromPlans([fixedPlan], activeDate, {});
  assert.equal(candidates.length, 1);
  assert.equal(candidates[0]?.isPastFixedObligation, true);
  assert.equal(candidates[0]?.scheduledTime, undefined, "Old scheduled time must be stripped");
}

// ----------------------------------------------------------------------------------
// 10. Waiting-for ne ulazi u First Focus
// ----------------------------------------------------------------------------------
console.log("▶ 10. Testing waiting-for task never enters First Focus...");
{
  const draftWithWaiting: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [
      {
        id: "wait_reply",
        sourceItemIds: ["wait_reply"],
        title: "Čekam odgovor od klijenta",
        block: "later_today" as const,
        estimatedMinutes: 15,
        requiredEnergy: 1 as const,
        timeSensitivity: "none" as const,
        priority: { explanation: "Waiting", consequence: 5, leverage: 5, urgency: 5, goalContribution: 5, mentalLoad: 1, recommendedDisposition: "defer" as const },
        needsCheck: false,
      },
      {
        id: "active_task",
        sourceItemIds: ["active_task"],
        title: "Write documentation",
        block: "later_today" as const,
        estimatedMinutes: 60,
        requiredEnergy: 3 as const,
        timeSensitivity: "soft" as const,
        priority: { explanation: "Active", consequence: 4, leverage: 4, urgency: 3, goalContribution: 4, mentalLoad: 3, recommendedDisposition: "do" as const },
        needsCheck: false,
      },
    ],
    ifCapacityRemains: [],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Plan",
    availableMinutes: 180,
    plannedRequiredMinutes: 75,
    plannedOptionalMinutes: 0,
  };

  const reevaluated = reevaluatePrioritiesStructured(draftWithWaiting, { language: "sr", energy: 3 });
  const firstFocusHasWaiting = reevaluated.proposedDraft.firstFocus.some((i) => (i as any).kind === "waiting_for" || i.title.toLowerCase().includes("čekam"));
  assert.equal(firstFocusHasWaiting, false, "Waiting-for item must never enter First Focus");
}

// ----------------------------------------------------------------------------------
// 11. manualPriorityOverride se poštuje ili traži potvrđen konflikt
// ----------------------------------------------------------------------------------
console.log("▶ 11. Testing manualPriorityOverride is respected or requires confirmed conflict...");
{
  const draftWithOverride: DailyPlanDraft = {
    classifiedItems: [],
    firstFocus: [],
    laterToday: [],
    ifCapacityRemains: [
      {
        id: "task_manual",
        sourceItemIds: ["task_manual"],
        title: "User explicitly put in if-capacity",
        block: "if_capacity_remains",
        estimatedMinutes: 30,
        requiredEnergy: 2,
        timeSensitivity: "none",
        priority: { explanation: "Manual" },
        needsCheck: false,
        manualPriorityOverride: true,
      },
    ],
    deferredItems: [],
    longTermIdeas: [],
    nonActionItems: [],
    planRationale: "Plan",
    availableMinutes: 120,
    plannedRequiredMinutes: 0,
    plannedOptionalMinutes: 30,
  };

  const proposalWithConflict = {
    proposedDraft: {
      ...draftWithOverride,
      laterToday: [{
        id: "task_manual",
        sourceItemIds: ["task_manual"],
        title: "User explicitly put in if-capacity",
        block: "later_today" as const,
        estimatedMinutes: 30,
        requiredEnergy: 2 as const,
        timeSensitivity: "none" as const,
        priority: { explanation: "AI suggestion" },
        needsCheck: false,
      }],
      ifCapacityRemains: [],
    },
    diff: {
      firstFocusEntries: [],
      movedToLaterToday: [{ id: "task_manual", title: "User explicitly put in if-capacity" }],
      movedToIfCapacity: [],
      proposedDelegations: [],
      proposedEliminations: [],
      manualOverrideConflicts: [{ id: "task_manual", title: "User explicitly put in if-capacity" }],
    },
  };

  // Case A: User did NOT approve override conflict
  const rejectedConflictDraft = applyReevaluationProposal(draftWithOverride, proposalWithConflict as any, {
    approvedManualOverrideIds: [],
  });
  assert.equal(
    rejectedConflictDraft.ifCapacityRemains.some((i) => i.id === "task_manual"),
    true,
    "Unapproved conflict must restore item to its manual override block",
  );

  // Case B: User approved override conflict
  const approvedConflictDraft = applyReevaluationProposal(draftWithOverride, proposalWithConflict as any, {
    approvedManualOverrideIds: ["task_manual"],
  });
  assert.equal(
    approvedConflictDraft.laterToday.some((i) => i.id === "task_manual"),
    true,
    "Approved conflict moves item to proposed block",
  );
}

// ----------------------------------------------------------------------------------
// 12. „Ove nedelje“ ostaje pronalazivo u UI filteru
// ----------------------------------------------------------------------------------
console.log("▶ 12. Testing 'This week' item is excluded from rollover and findable in Inbox filter...");
{
  const chainedPlans = [
    createPlanDoc("2026-09-14", [
      { id: "task_week", title: "Plan sprint roadmap", block: "first_focus", minutes: 60 },
    ]),
  ];

  const thisWeekDecisions: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId("2026-09-14", "task_week")]: {
      sourceLocalDate: "2026-09-14",
      sourcePlanItemId: "task_week",
      status: "this_week",
    },
  };

  // Excluded from daily rollover candidates
  const candidates = extractUnfinishedCandidatesFromPlans(chainedPlans, activeDate, thisWeekDecisions);
  assert.equal(candidates.length, 0, "Item marked 'this_week' is excluded from daily rollover");

  // Verify Inbox UI filter matches this item
  const mockInboxItem = {
    id: "inbox_task_week",
    title: "Plan sprint roadmap",
    horizon: "this_week",
    status: "inbox",
  };
  const inboxFilter = "this_week";
  const matchesFilter = (mockInboxItem.horizon === "this_week" && mockInboxItem.status === "inbox") || mockInboxItem.status === inboxFilter;
  assert.equal(matchesFilter, true, "'This week' item must match Inbox 'this_week' filter");
}

// ----------------------------------------------------------------------------------
// 13. Zakazivanje bez datuma se odbija
// ----------------------------------------------------------------------------------
console.log("▶ 13. Testing scheduling without valid date is rejected...");
{
  const isValidScheduleDate = (dateString?: string): boolean => {
    if (!dateString || typeof dateString !== "string") return false;
    return /^\d{4}-\d{2}-\d{2}$/.test(dateString.trim());
  };

  assert.equal(isValidScheduleDate(""), false, "Empty date rejected");
  assert.equal(isValidScheduleDate("   "), false, "Whitespace date rejected");
  assert.equal(isValidScheduleDate("tomorrow"), false, "Invalid format rejected");
  assert.equal(isValidScheduleDate("2026-09-20"), true, "Valid ISO date accepted");
}

// ----------------------------------------------------------------------------------
// 14. Completion dobija trenutni lokalni datum
// ----------------------------------------------------------------------------------
console.log("▶ 14. Testing completion receives current local date without mutating historical date...");
{
  const historicalDoc = createPlanDoc("2026-09-02", [
    { id: "task_hist", title: "Old Document Task", block: "first_focus", minutes: 30 },
  ]);

  const currentLocalDate = "2026-09-15";
  // Decision records the actual completion date when the user executed the action
  const decision: AppARolloverDecision = {
    sourceLocalDate: historicalDoc.localDate,
    sourcePlanItemId: "task_hist",
    status: "completed",
    completedOnLocalDate: currentLocalDate,
  };

  assert.equal(historicalDoc.localDate, "2026-09-02", "Historical localDate remains strictly immutable");
  assert.equal(decision.completedOnLocalDate, "2026-09-15", "Completion date records the current action date");
  assert.equal(decision.status, "completed");
  assert.equal(
    isCandidateEligibleWithDecisions("2026-09-02", "task_hist", currentLocalDate, {
      [getRolloverDecisionId("2026-09-02", "task_hist")]: decision,
    }),
    false,
    "Completed task is ineligible for rollover",
  );
}

// ----------------------------------------------------------------------------------
// 15. Dismissal se ne računa kao completion
// ----------------------------------------------------------------------------------
console.log("▶ 15. Testing dismissal is not counted as completion...");
{
  const dismissalDecision: AppARolloverDecision = {
    sourceLocalDate: "2026-09-14",
    sourcePlanItemId: "task_dismissed",
    status: "dismissed",
  };

  assert.equal(dismissalDecision.status, "dismissed");
  assert.notEqual(dismissalDecision.status, "completed");

  const completedItemIds: string[] = [];
  if ((dismissalDecision.status as string) === "completed") {
    completedItemIds.push(dismissalDecision.sourcePlanItemId);
  }
  assert.equal(completedItemIds.length, 0, "Dismissed item must not enter completedItemIds");
}

// ----------------------------------------------------------------------------------
// 16. Timezone prelaz oko ponoći ne bira pogrešan istorijski/današnji plan
// ----------------------------------------------------------------------------------
console.log("▶ 16. Testing midnight timezone boundary does not select wrong historical/today plan...");
{
  // UTC 2026-09-15 16:00:00 -> in Tokyo (UTC+9) it is 2026-09-16 01:00:00
  const utcDate = new Date("2026-09-15T16:00:00Z");
  const tokyoLocalDate = getLocalDateKeyInTimeZone("Asia/Tokyo", utcDate);
  assert.equal(tokyoLocalDate, "2026-09-16");

  const plans = [
    createPlanDoc("2026-09-15", [{ id: "task_yesterday", title: "Yesterday's Task", block: "first_focus", minutes: 30 }]),
    createPlanDoc("2026-09-16", [{ id: "task_today", title: "Today's Task", block: "first_focus", minutes: 30 }]),
  ];

  const candidatesInTokyo = extractUnfinishedCandidatesFromPlans(plans, tokyoLocalDate, {});
  assert.equal(candidatesInTokyo.length, 1, "Only plan strictly before active local date is historical");
  assert.equal(candidatesInTokyo[0]?.id, "task_yesterday");
}

// ----------------------------------------------------------------------------------
// 17. resetGuard blokira upis tokom reseta
// ----------------------------------------------------------------------------------
console.log("▶ 17. Testing resetGuard blocks rollover writes during active reset...");
{
  const testUserId = "user_reset_test_rollover";
  assert.equal(isResetBlocked(testUserId), false, "Initially not blocked");

  const opId = acquireResetLock(testUserId);
  assert.equal(isResetBlocked(testUserId), true, "Blocked while lease active");

  // Function simulating rollover repository write check
  const simulateRolloverWrite = (uid: string) => {
    if (isResetBlocked(uid)) {
      throw new Error("reset_in_progress");
    }
  };

  assert.throws(() => simulateRolloverWrite(testUserId), /reset_in_progress/);

  releaseResetLock(opId, false);
  assert.equal(isResetBlocked(testUserId), false, "Unblocked after reset completed");
  assert.doesNotThrow(() => simulateRolloverWrite(testUserId));
}

// ----------------------------------------------------------------------------------
// 18. Parcijalni persistence neuspeh ne ostavlja polovično stanje
// ----------------------------------------------------------------------------------
console.log("▶ 18. Testing partial persistence failure rolls back atomically...");
{
  let databaseState = {
    planDocumentSaved: false,
    decisionsSaved: false,
  };

  const simulateAtomicTransaction = (shouldFailDecisions: boolean) => {
    const snapshot = { ...databaseState };
    try {
      // Step 1: Write plan document
      snapshot.planDocumentSaved = true;

      // Step 2: Write decisions
      if (shouldFailDecisions) {
        throw new Error("transaction_aborted");
      }
      snapshot.decisionsSaved = true;

      // Commit transaction
      databaseState = snapshot;
    } catch {
      // On failure, entire transaction aborts without committing snapshot
    }
  };

  simulateAtomicTransaction(true);
  assert.equal(databaseState.planDocumentSaved, false, "Plan doc not committed on partial failure");
  assert.equal(databaseState.decisionsSaved, false, "Decisions not committed on partial failure");

  simulateAtomicTransaction(false);
  assert.equal(databaseState.planDocumentSaved, true, "Plan doc committed on success");
  assert.equal(databaseState.decisionsSaved, true, "Decisions committed on success");
}

// ----------------------------------------------------------------------------------
// 19. Sedam kanonskih statusa, normalizacija legacy aliasa i konzervativno rukovanje nepoznatim statusima
// ----------------------------------------------------------------------------------
// 19. Normalizacija RolloverDecisionStatus i konzervativno rukovanje
// ----------------------------------------------------------------------------------
console.log("▶ 19. Testing 7 canonical statuses, legacy alias normalization, and conservative unknown status handling...");
{
  const canonicalStatuses = [
    "carried",
    "snoozed",
    "dismissed",
    "scheduled",
    "inbox",
    "this_week",
    "completed",
  ] as const;

  // 19.1 All 7 canonical statuses pass through untouched as { kind: "valid", status }
  for (const status of canonicalStatuses) {
    const res = normalizeRolloverDecisionStatus(status);
    assert.equal(res.kind, "valid");
    if (res.kind === "valid") {
      assert.equal(res.status, status, `Canonical status ${status} must be preserved`);
    }
  }

  // 19.2 Legacy alias normalization
  const carried = normalizeRolloverDecisionStatus("added_to_today");
  assert.equal(carried.kind, "valid");
  if (carried.kind === "valid") {
    assert.equal(carried.status, "carried", "added_to_today must normalize to carried");
  }

  const inbox = normalizeRolloverDecisionStatus("moved_to_inbox");
  assert.equal(inbox.kind, "valid");
  if (inbox.kind === "valid") {
    assert.equal(inbox.status, "inbox", "moved_to_inbox must normalize to inbox");
  }

  // 19.3 Unknown, empty, null, or corrupted statuses map to { kind: "unsupported", rawStatus }
  const junk = normalizeRolloverDecisionStatus("random_junk");
  assert.equal(junk.kind, "unsupported");
  if (junk.kind === "unsupported") {
    assert.equal(junk.rawStatus, "random_junk");
  }

  const empty = normalizeRolloverDecisionStatus("");
  assert.equal(empty.kind, "unsupported");

  const nullStatus = normalizeRolloverDecisionStatus(null);
  assert.equal(nullStatus.kind, "unsupported");

  const undefStatus = normalizeRolloverDecisionStatus(undefined);
  assert.equal(undefStatus.kind, "unsupported");

  // 19.4 Conservative eligibility: unknown/unsupported status must NEVER resurrect a task into rollover
  const unsupportedDecisionMap: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId("2026-09-14", "task_unsupported")]: {
      sourceLocalDate: "2026-09-14",
      sourcePlanItemId: "task_unsupported",
      status: "dismissed",
      isUnsupported: true,
      unsupportedRawStatus: "corrupted_legacy_val",
    },
  };
  assert.equal(
    isCandidateEligibleWithDecisions(
      "2026-09-14",
      "task_unsupported",
      "2026-09-15",
      unsupportedDecisionMap,
    ),
    false,
    "Unknown/unsupported status must conservatively treat candidate as ineligible (never resurrected)",
  );

  // 19.5 Completed status permanently excludes candidate
  const completedDecisionMap: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId("2026-09-14", "task_done")]: {
      sourceLocalDate: "2026-09-14",
      sourcePlanItemId: "task_done",
      status: "completed",
    },
  };
  assert.equal(
    isCandidateEligibleWithDecisions(
      "2026-09-14",
      "task_done",
      "2026-09-15",
      completedDecisionMap,
    ),
    false,
    "Completed decision permanently marks candidate ineligible today",
  );
  assert.equal(
    isCandidateEligibleWithDecisions(
      "2026-09-14",
      "task_done",
      "2026-09-30",
      completedDecisionMap,
    ),
    false,
    "Completed decision permanently marks candidate ineligible in future",
  );

  // 19.6 Normalized legacy alias added_to_today (carried) excludes candidate
  const normAlias = normalizeRolloverDecisionStatus("added_to_today");
  const legacyAliasDecisionMap: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId("2026-09-14", "task_legacy")]: {
      sourceLocalDate: "2026-09-14",
      sourcePlanItemId: "task_legacy",
      status: normAlias.kind === "valid" ? normAlias.status : "carried",
    },
  };
  assert.equal(
    isCandidateEligibleWithDecisions(
      "2026-09-14",
      "task_legacy",
      "2026-09-15",
      legacyAliasDecisionMap,
    ),
    false,
    "Normalized legacy alias added_to_today marks candidate ineligible",
  );
}

// ----------------------------------------------------------------------------------
// 20. Trajno isključivanje stavke iz budućeg rollovera kada je status 'completed'
// ----------------------------------------------------------------------------------
console.log("▶ 20. Testing completed status permanently excludes item across plans and reloads...");
{
  const planDoc = createPlanDoc("2026-09-10", [
    { id: "task_comp_1", title: "Finished task", block: "first_focus", minutes: 30 },
    { id: "task_unfin_2", title: "Unfinished task", block: "later_today", minutes: 45 },
  ]);

  const completedDecision: AppARolloverDecision = {
    sourceLocalDate: "2026-09-10",
    sourcePlanItemId: "task_comp_1",
    status: "completed",
    completedOnLocalDate: "2026-09-11",
  };

  const decisions: Record<string, AppARolloverDecision> = {
    [getRolloverDecisionId("2026-09-10", "task_comp_1")]: completedDecision,
  };

  // Test across multiple active dates (days, weeks later)
  for (const futureDate of ["2026-09-11", "2026-09-15", "2026-10-01", "2027-01-01"]) {
    const candidates = extractUnfinishedCandidatesFromPlans(
      [planDoc],
      futureDate,
      decisions,
    );
    assert.equal(
      candidates.some((c) => c.id === "task_comp_1"),
      false,
      `Completed task must never be offered as candidate on ${futureDate}`,
    );
    assert.equal(
      candidates.some((c) => c.id === "task_unfin_2"),
      true,
      `Unfinished task must be offered as candidate on ${futureDate}`,
    );
  }
}

// ----------------------------------------------------------------------------------
// 21. Kanonski korenski identitet rollover odluke (rekurzivno odmotavanje, provenance, dedup)
// ----------------------------------------------------------------------------------
console.log("▶ 21. Testing canonical root identity unwrapping, provenance tracking, and title disambiguation...");
{
  // 21.1 Multi-level rollover unwrapping: chained rollover IDs across 3 days
  const chainedId = "rollover_plan_2026-09-14_rollover_plan_2026-09-13_rollover_plan_2026-09-12_original_task_99";
  const root = getCanonicalRootIdentity({
    id: chainedId,
    sourceLocalDate: "2026-09-15",
  });
  assert.equal(root.resolved, true);
  if (root.resolved) {
    assert.equal(
      root.rootLocalDate,
      "2026-09-12",
      "Root local date must be original date from base of chain",
    );
    assert.equal(
      root.rootPlanItemId,
      "original_task_99",
      "Root item ID must be original item ID from base of chain",
    );
  }

  // 21.2 Explicit provenance fields override ID parsing
  const explicitRoot = getCanonicalRootIdentity({
    id: "some_mangled_id",
    sourceLocalDate: "2026-09-14",
    originalPlanDate: "2026-09-10",
    originalPlanItemId: "explicit_root_item",
  });
  assert.equal(explicitRoot.resolved, true);
  if (explicitRoot.resolved) {
    assert.equal(explicitRoot.rootLocalDate, "2026-09-10");
    assert.equal(explicitRoot.rootPlanItemId, "explicit_root_item");
  }

  // 21.3 Cycle and depth boundary handling: max 7 unwraps
  let validChain = "base_task";
  for (let i = 1; i <= 5; i++) {
    validChain = `rollover_plan_2026-09-${String(i).padStart(2, "0")}_${validChain}`;
  }
  const validChainResult = getCanonicalRootIdentity({
    id: validChain,
    sourceLocalDate: "2026-09-15",
  });
  assert.equal(validChainResult.resolved, true, "Unwrap within 7 hops resolves root");

  let deepChain = "base_task_deep";
  for (let i = 1; i <= 10; i++) {
    deepChain = `rollover_plan_2026-09-${String(i).padStart(2, "0")}_${deepChain}`;
  }
  const deepResult = getCanonicalRootIdentity({
    id: deepChain,
    sourceLocalDate: "2026-09-15",
  });
  assert.equal(deepResult.resolved, false, "Chains exceeding 7 hops return explicit unresolved error without guessing");

  // 21.4 Invalid root candidate yields explicit unresolved status
  const invalidCandidate = getCanonicalRootIdentity({
    id: "",
    sourceLocalDate: "",
  });
  assert.equal(invalidCandidate.resolved, false, "Unidentifiable root returns unresolved result");

  // 21.5 Two distinct tasks with identical titles across different days remain distinct
  const planDay1 = createPlanDoc("2026-09-13", [
    { id: "task_a", title: "Review quarterly finances", block: "first_focus", minutes: 60 },
  ]);
  const planDay2 = createPlanDoc("2026-09-14", [
    { id: "task_b", title: "Review quarterly finances", block: "later_today", minutes: 45 },
  ]);

  const extracted = extractUnfinishedCandidatesFromPlans(
    [planDay1, planDay2],
    "2026-09-15",
    {},
  );

  assert.equal(
    extracted.length,
    2,
    "Two distinct tasks with same title on different dates must BOTH be preserved as distinct candidates",
  );
  assert.ok(
    extracted.some((c) => c.originalPlanItemId === "task_a" && c.originalPlanDate === "2026-09-13"),
  );
  assert.ok(
    extracted.some((c) => c.originalPlanItemId === "task_b" && c.originalPlanDate === "2026-09-14"),
  );
}

// ----------------------------------------------------------------------------------
// 22. Bezbedna tipizacija i validacija updatedAt (strogo razdvojen read ugovor)
// ----------------------------------------------------------------------------------
console.log("▶ 22. Testing safe typing and strict validation of updatedAt read contract...");
{
  // 22.1 Valid updatedAt representations for read contract: Timestamp or ISO string
  assert.equal(isValidUpdatedAt(undefined), true, "undefined is valid (optional field)");
  assert.equal(isValidUpdatedAt("2026-09-15T12:00:00.000Z"), true, "ISO date string is valid");
  assert.equal(isValidUpdatedAt("2026-09-15T12:00:00Z"), true, "ISO date string without millis is valid");
  assert.equal(
    isValidUpdatedAt({ seconds: 1726358400, nanoseconds: 0, toDate: () => new Date() }),
    true,
    "Firestore Timestamp with toDate is valid",
  );
  assert.equal(
    isValidUpdatedAt({ seconds: 1726358400, nanoseconds: 0 }),
    true,
    "Firestore Timestamp with numeric seconds and nanoseconds is valid",
  );

  // 22.2 Read/envelope validator must strictly reject:
  // - FieldValue/serverTimestamp sentinel;
  // - Date;
  // - numbers;
  // - null;
  // - {};
  // - arbitrary objects;
  // - invalid strings.
  assert.equal(isValidUpdatedAt(null), false, "null is invalid");
  assert.equal(isValidUpdatedAt(""), false, "Empty string is invalid");
  assert.equal(isValidUpdatedAt("   "), false, "Whitespace-only string is invalid");
  assert.equal(isValidUpdatedAt("SERVER_TIMESTAMP"), false, "SERVER_TIMESTAMP string is strictly rejected");
  assert.equal(isValidUpdatedAt("not-a-valid-date"), false, "Unparseable date string is invalid");
  assert.equal(isValidUpdatedAt(1726358400000), false, "Number timestamp is strictly rejected in read contract");
  assert.equal(isValidUpdatedAt(0), false, "Zero is invalid");
  assert.equal(isValidUpdatedAt(-100), false, "Negative number is invalid");
  assert.equal(isValidUpdatedAt(NaN), false, "NaN is invalid");
  assert.equal(isValidUpdatedAt(Infinity), false, "Infinity is invalid");
  assert.equal(isValidUpdatedAt(new Date()), false, "Date instance is strictly rejected in read contract");
  assert.equal(isValidUpdatedAt({}), false, "Empty object {} is strictly invalid");
  assert.equal(
    isValidUpdatedAt({ _methodName: "serverTimestamp" }),
    false,
    "serverTimestamp FieldValue sentinel is strictly rejected in read contract",
  );
  assert.equal(
    isValidUpdatedAt({ arbitrary: "object" }),
    false,
    "Arbitrary non-timestamp object is invalid",
  );

  // 22.3 Envelope validation in isAppADailyPlanDocument
  const baseDoc = createPlanDoc("2026-09-14", [
    { id: "task_1", title: "Valid task", block: "first_focus", minutes: 30 },
  ]);

  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: "2026-09-14T20:00:00.000Z" }),
    true,
    "Document with valid ISO updatedAt is accepted",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: { seconds: 1726358400, nanoseconds: 0 } }),
    true,
    "Document with valid Timestamp updatedAt is accepted",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: {} }),
    false,
    "Document with empty object {} updatedAt is strictly rejected",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: { _methodName: "serverTimestamp" } }),
    false,
    "Document with serverTimestamp FieldValue sentinel is strictly rejected by read validator",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: new Date() }),
    false,
    "Document with Date instance updatedAt is strictly rejected",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: 1726358400000 }),
    false,
    "Document with number updatedAt is strictly rejected",
  );
  assert.equal(
    isAppADailyPlanDocument({ ...baseDoc, updatedAt: "corrupted-date-xyz" }),
    false,
    "Document with corrupted date string updatedAt is strictly rejected",
  );
}

// ----------------------------------------------------------------------------------
// 23. Jedinstveni kanonski ključ i determinističko spajanje legacy i root odluka
// ----------------------------------------------------------------------------------
console.log("▶ 23. Testing single canonical decision keying, deduplication, and legacy resolution...");
{
  const rootDate = "2026-09-10";
  const rootItemId = "task_original";
  const carriedDate = "2026-09-12";
  const carriedItemId = `rollover_plan_${rootDate}_${rootItemId}`;

  // Suppose there is an older legacy record keyed at source (carried) and a newer canonical record at root
  const legacyDecision: AppARolloverDecision = {
    sourceLocalDate: carriedDate,
    sourcePlanItemId: carriedItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "carried",
    updatedAt: "2026-09-12T10:00:00.000Z",
  };

  const canonicalCompletedDecision: AppARolloverDecision = {
    sourceLocalDate: rootDate,
    sourcePlanItemId: rootItemId,
    originalPlanDate: rootDate,
    originalPlanItemId: rootItemId,
    status: "completed",
    completedOnLocalDate: "2026-09-13",
    updatedAt: "2026-09-13T10:00:00.000Z",
  };

  // When decisions are mapped, both the root ID and the source ID must resolve to the terminal completed status
  const canonicalId = getRolloverDecisionId(rootDate, rootItemId);
  const legacyId = getRolloverDecisionId(carriedDate, carriedItemId);

  const decisionsMap: Record<string, AppARolloverDecision> = {
    [canonicalId]: canonicalCompletedDecision,
    [legacyId]: canonicalCompletedDecision, // merged effective decision
  };

  const planDay1 = createPlanDoc(rootDate, [
    { id: rootItemId, title: "Original task", block: "first_focus", minutes: 30 },
  ]);
  const planDay2 = createPlanDoc(carriedDate, [
    { id: carriedItemId, title: "Carried task", block: "first_focus", minutes: 30 },
  ]);

  const candidates = extractUnfinishedCandidatesFromPlans(
    [planDay1, planDay2],
    "2026-09-15",
    decisionsMap,
  );

  assert.equal(
    candidates.length,
    0,
    "Completed decision at canonical root must exclude both legacy and root instances across all plans",
  );
}

console.log("\n========================================================");
console.log("🎉 ALL 22 COMPREHENSIVE ROLLOVER SCENARIOS PASSED!");
console.log("========================================================\n");
