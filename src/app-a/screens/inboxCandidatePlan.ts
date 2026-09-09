import type { ClassifiedBrainDumpItem, DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { normalizeInboxTitle } from "../domain/inbox/contracts";
import { recalculatePlanTotals, validatePlanDraft } from "../domain/daily-reset/validation";

export type AddInboxItemResult = { draft: DailyPlanDraft } | { error: "duplicate" | "duration_required" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" };

export interface AddInboxItemOptions {
  reconsiderPriorities?: boolean;
  completedItemIds?: string[];
}

export function getInboxPlanningMinutes(item: AppAInboxItem): number {
  return Number.isInteger(item.estimatedMinutes) && (item.estimatedMinutes || 0) > 0 && (item.estimatedMinutes || 0) <= 1440
    ? item.estimatedMinutes as number
    : 20;
}

export interface PriorityChangeSummary {
  firstFocus: string[];
  movedLater: string[];
  movedOptional: string[];
}

export type AddInboxItemWithSummaryResult =
  | { draft: DailyPlanDraft; changes: PriorityChangeSummary }
  | { error: "duplicate" | "duration_required" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" };

function priorityScore(item: DailyPlanItem): number {
  const p = item.priority || { explanation: "" };
  const sensitivity = item.timeSensitivity === "urgent" ? 12 : item.timeSensitivity === "deadline" ? 7 : item.timeSensitivity === "soft" ? 2 : 0;
  const goalLeverage = item.goalRelationship?.goalId || item.goalRelationship?.goalTitle ? 3 : 0;
  return (p.consequence || 1) * 4 + (p.urgency || 1) * 4 + (p.goalContribution || 1) * 3
    + (p.dependencyPressure || 1) * 2 + sensitivity + goalLeverage;
}

function summarizeChanges(before: DailyPlanDraft, after: DailyPlanDraft, newItemId: string): PriorityChangeSummary {
  const oldBlocks = new Map([...before.firstFocus, ...before.laterToday, ...before.ifCapacityRemains].map((item) => [item.id, item.block]));
  return {
    firstFocus: after.firstFocus.filter((item) => item.id === newItemId || oldBlocks.get(item.id) !== "first_focus").map((item) => item.title),
    movedLater: after.laterToday.filter((item) => oldBlocks.has(item.id) && oldBlocks.get(item.id) !== "later_today").map((item) => item.title),
    movedOptional: after.ifCapacityRemains.filter((item) => oldBlocks.has(item.id) && oldBlocks.get(item.id) !== "if_capacity_remains").map((item) => item.title),
  };
}

export function addInboxItemToPlan(draft: DailyPlanDraft, item: AppAInboxItem, options: AddInboxItemOptions = {}): AddInboxItemWithSummaryResult {
  if (!item.estimatedMinutes) return { error: "duration_required" };
  const sourceId = `inbox_source_${item.id}`;
  const planItemId = `inbox_plan_${item.id}`;
  const allPlanItems = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains];
  const title = normalizeInboxTitle(item.title);
  if (draft.classifiedItems.some((entry) => entry.id === sourceId || normalizeInboxTitle(entry.suggestedAction || entry.originalText) === title)
    || allPlanItems.some((entry) => entry.id === planItemId || entry.sourceItemIds.includes(sourceId) || normalizeInboxTitle(entry.title) === title)) {
    return { error: "duplicate" };
  }
  const capacityType = item.capacityType || "flexible";
  const exceedsExplicitCapacity = capacityType === "flexible" && draft.availableMinutes !== undefined
    && (draft.plannedFlexibleMinutes ?? draft.plannedRequiredMinutes) + item.estimatedMinutes > draft.availableMinutes;
  const priority = options.reconsiderPriorities
    ? { consequence: 4 as const, urgency: 5 as const, goalContribution: 3 as const, explanation: "Marked urgent by the user and reconsidered against unfinished priorities." }
    : { explanation: "Added by the user from Inbox." };
  const classified: ClassifiedBrainDumpItem = {
    id: sourceId,
    originalText: item.title,
    kind: "task",
    timeHorizon: "today",
    suggestedAction: item.title,
    estimatedMinutes: item.estimatedMinutes,
    requiredEnergy: 3,
    timeSensitivity: options.reconsiderPriorities ? "urgent" : "none",
    isAmbiguous: false,
    needsCheck: false,
    priority,
  };
  const planItem: DailyPlanItem = {
    id: planItemId,
    sourceItemIds: [sourceId],
    title: item.title,
    ...(item.details ? { description: item.details } : {}),
    block: options.reconsiderPriorities && capacityType === "flexible" ? "first_focus" : exceedsExplicitCapacity ? "if_capacity_remains" : "later_today",
    estimatedMinutes: item.estimatedMinutes,
    capacityType,
    requiredEnergy: 3,
    timeSensitivity: options.reconsiderPriorities ? "urgent" : "none",
    priority,
    reasoning: "Added by explicit user action from Inbox.",
    needsCheck: false,
  };
  if (!options.reconsiderPriorities || capacityType === "fixed") {
    const next = recalculatePlanTotals({
      ...draft,
      classifiedItems: [...draft.classifiedItems, classified],
      laterToday: exceedsExplicitCapacity ? draft.laterToday : [...draft.laterToday, planItem],
      ifCapacityRemains: exceedsExplicitCapacity ? [...draft.ifCapacityRemains, planItem] : draft.ifCapacityRemains,
    });
    return validatePlanDraft(next).valid ? { draft: next, changes: { firstFocus: [], movedLater: [], movedOptional: [] } } : { error: "invalid_plan" };
  }

  const completed = new Set(options.completedItemIds || []);
  const lockedFirstFocus = draft.firstFocus.filter((entry) => completed.has(entry.id) || entry.capacityType === "fixed");
  const movableItems = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains]
    .filter((entry) => !completed.has(entry.id) && entry.capacityType !== "fixed");
  const ranked = [...movableItems, planItem].sort((a, b) => priorityScore(b) - priorityScore(a));
  const selectedIds = new Set(ranked.slice(0, Math.max(0, 3 - lockedFirstFocus.length)).map((entry) => entry.id));
  let nextFirstFocus = [...lockedFirstFocus, ...ranked.filter((entry) => selectedIds.has(entry.id)).map((entry) => ({ ...entry, block: "first_focus" as const }))];
  let nextLater = [
    ...draft.laterToday.filter((entry) => completed.has(entry.id) || entry.capacityType === "fixed"),
    ...ranked.filter((entry) => !selectedIds.has(entry.id)).map((entry) => ({ ...entry, block: "later_today" as const })),
  ];
  let nextOptional = draft.ifCapacityRemains.filter((entry) => completed.has(entry.id));
  let next = recalculatePlanTotals({ ...draft, classifiedItems: [...draft.classifiedItems, classified], firstFocus: nextFirstFocus, laterToday: nextLater, ifCapacityRemains: nextOptional });

  if (draft.availableMinutes !== undefined && (next.plannedFlexibleMinutes || 0) > draft.availableMinutes) {
    const demotable = [...nextLater, ...nextFirstFocus]
      .filter((entry) => entry.id !== planItemId && !completed.has(entry.id) && entry.capacityType !== "fixed")
      .sort((a, b) => priorityScore(a) - priorityScore(b));
    for (const entry of demotable) {
      if ((next.plannedFlexibleMinutes || 0) <= draft.availableMinutes) break;
      nextFirstFocus = nextFirstFocus.filter((candidate) => candidate.id !== entry.id);
      nextLater = nextLater.filter((candidate) => candidate.id !== entry.id);
      nextOptional = [...nextOptional, { ...entry, block: "if_capacity_remains" as const }];
      next = recalculatePlanTotals({ ...next, firstFocus: nextFirstFocus, laterToday: nextLater, ifCapacityRemains: nextOptional });
    }
  }
  if (draft.availableMinutes !== undefined && (next.plannedFlexibleMinutes || 0) > draft.availableMinutes) return { error: "capacity_exceeded" };
  return validatePlanDraft(next).valid ? { draft: next, changes: summarizeChanges(draft, next, planItemId) } : { error: "invalid_plan" };
}
