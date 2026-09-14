import assert from "node:assert/strict";
import {
  buildReevaluatePrioritiesPrompt,
  reevaluateModelSchema,
  parseReevaluateModelResponse,
  type ReevaluationInputContext,
} from "./index";
import type { DailyPlanDraft, DailyPlanItem } from "../../../src/app-a/domain/daily-reset/contracts";
import type { UnfinishedRolloverCandidate } from "../../../src/app-a/domain/rollover/contracts";

console.log("Running Canonical AI Reevaluation Endpoint Contract Test...");

// 1. Unified Protocol Invariant Test
// Both UI Entry Points (Reevaluate Priorities & Rollover AI Reevaluation) MUST share:
// - The exact same request structure
// - The exact same prompt generation logic
// - The exact same model schema
// - The exact same semantic validation and repair rules

const baseDraft: DailyPlanDraft = {
  classifiedItems: [
    {
      id: "item_core",
      originalText: "Core Daily Deliverable",
      kind: "task",
      timeHorizon: "today",
      estimatedMinutes: 60,
      timeSensitivity: "none",
      isAmbiguous: false,
      needsCheck: false,
      priority: { explanation: "Primary daily focus" },
    },
  ],
  firstFocus: [
    {
      id: "item_core",
      sourceItemIds: ["item_core"],
      title: "Core Daily Deliverable",
      block: "first_focus",
      estimatedMinutes: 60,
      requiredEnergy: 3,
      timeSensitivity: "none",
      priority: { explanation: "Primary daily focus" },
      needsCheck: false,
    },
  ],
  laterToday: [],
  ifCapacityRemains: [],
  deferredItems: [],
  longTermIdeas: [],
  nonActionItems: [],
  planRationale: "Existing base plan",
  availableMinutes: 240,
  plannedRequiredMinutes: 60,
  plannedOptionalMinutes: 0,
};

// Simulate Rollover Candidates selected for AI Reevaluation
const rolloverCandidates: UnfinishedRolloverCandidate[] = [
  {
    id: "task_tax_audit",
    sourceLocalDate: "2026-09-08",
    title: "Review Tax Documents",
    estimatedMinutes: 45,
    requiredEnergy: 4,
    timeSensitivity: "deadline",
    block: "first_focus",
    priority: { explanation: "Quarterly compliance" },
  },
  {
    id: "task_clean_inbox",
    sourceLocalDate: "2026-09-10",
    title: "Clean Out Vendor Emails",
    estimatedMinutes: 30,
    requiredEnergy: 2,
    timeSensitivity: "none",
    block: "if_capacity_remains",
    priority: { explanation: "Low urgency inbox triage" },
  },
];

// Unified integration format: rollover items formatted into reevaluation draft
const rolloverPlanItems: DailyPlanItem[] = rolloverCandidates.map((c) => ({
  id: `rollover_plan_${c.sourceLocalDate}_${c.id}`,
  sourceItemIds: [c.id],
  title: c.title,
  block: "later_today" as const,
  estimatedMinutes: c.estimatedMinutes,
  requiredEnergy: c.requiredEnergy,
  timeSensitivity: c.timeSensitivity,
  capacityType: "flexible" as const,
  priority: c.priority,
  needsCheck: false,
}));

const combinedDraft: DailyPlanDraft = {
  ...baseDraft,
  laterToday: [...baseDraft.laterToday, ...rolloverPlanItems],
  classifiedItems: [
    ...baseDraft.classifiedItems,
    ...rolloverPlanItems.map((r) => ({
      id: r.id,
      originalText: r.title,
      kind: "task" as const,
      timeHorizon: "today" as const,
      estimatedMinutes: r.estimatedMinutes,
      timeSensitivity: r.timeSensitivity,
      isAmbiguous: false,
      needsCheck: false,
      priority: r.priority,
    })),
  ],
};

const unfinishedItems = [
  ...combinedDraft.firstFocus.filter((i) => i.capacityType !== "fixed"),
  ...combinedDraft.laterToday.filter((i) => i.capacityType !== "fixed"),
  ...combinedDraft.ifCapacityRemains.filter((i) => i.capacityType !== "fixed"),
];

const reevalContext: ReevaluationInputContext = {
  localDate: "2026-09-15",
  energy: 3,
  pleasantness: 3,
  availableMinutes: 240,
  unfinishedFlexibleItems: unfinishedItems,
  completedItems: [],
  fixedItems: [],
  draft: combinedDraft,
  language: "sr",
};

const prompt = buildReevaluatePrioritiesPrompt(reevalContext);

assert.ok(prompt.includes("Core Daily Deliverable"), "Prompt must include base draft tasks");
assert.ok(prompt.includes("Review Tax Documents"), "Prompt must include rollover tasks");
assert.ok(prompt.includes("Clean Out Vendor Emails"), "Prompt must include all candidate tasks");
assert.ok(prompt.includes("firstFocusItemIds"), "Prompt must enforce reevaluation JSON schema");

// 2. Schema Integrity Verification
assert.ok(reevaluateModelSchema.properties.plan, "Model schema must define plan structure");
assert.ok(reevaluateModelSchema.properties.evaluations, "Model schema must define item evaluations");
assert.ok(reevaluateModelSchema.required.includes("plan"), "Plan is required in schema");
assert.ok(reevaluateModelSchema.required.includes("evaluations"), "Evaluations are required in schema");

// 3. Semantic Validator Acceptance Test
const rawAIResponse = {
  plan: {
    firstFocusItemIds: ["item_core", "rollover_plan_2026-09-08_task_tax_audit"],
    laterTodayItemIds: [],
    ifCapacityRemainsItemIds: ["rollover_plan_2026-09-10_task_clean_inbox"],
    deferredItemIds: [],
    summaryOfChanges: "Plan optimized with urgent rollover task in First Focus.",
  },
  evaluations: [
    {
      sourceItemId: "item_core",
      consequence: 5,
      urgency: 4,
      goalContribution: 5,
      leverage: 4,
      mentalLoad: 3,
      dependencyPressure: 2,
      recommendedDisposition: "do",
      proposedBlock: "first_focus",
      conciseExplanation: "Primary daily focus deliverable",
      confidence: "high",
    },
    {
      sourceItemId: "rollover_plan_2026-09-08_task_tax_audit",
      consequence: 5,
      urgency: 5,
      goalContribution: 4,
      leverage: 4,
      mentalLoad: 3,
      dependencyPressure: 3,
      recommendedDisposition: "do",
      proposedBlock: "first_focus",
      conciseExplanation: "Carried forward deadline compliance item",
      confidence: "high",
    },
    {
      sourceItemId: "rollover_plan_2026-09-10_task_clean_inbox",
      consequence: 2,
      urgency: 2,
      goalContribution: 2,
      leverage: 2,
      mentalLoad: 1,
      dependencyPressure: 1,
      recommendedDisposition: "do",
      proposedBlock: "if_capacity_remains",
      conciseExplanation: "Low consequence maintenance triage",
      confidence: "high",
    },
  ],
  energyInsight: "Adequate energy for 2 focus tasks.",
};

const parseResult = parseReevaluateModelResponse(rawAIResponse, reevalContext);
assert.equal(parseResult.success, true, "Valid reevaluation proposal must parse successfully");
if (parseResult.success) {
  assert.equal(parseResult.plan.firstFocusItemIds.length, 2, "First Focus contains 2 tasks");
  assert.ok(parseResult.plan.firstFocusItemIds.length <= 3, "First Focus must not exceed 3");
  assert.equal(parseResult.plan.ifCapacityRemainsItemIds.length, 1, "If capacity remains contains 1 task");
  assert.ok(parseResult.diff.firstFocusEntries.some((e) => e.id === "rollover_plan_2026-09-08_task_tax_audit"), "Diff accurately shows rollover task added to First Focus");
}

console.log("Canonical AI Reevaluation Endpoint Contract Test passed successfully!");
