import type { ClassifiedBrainDumpItem, DailyPlanDraft, DailyPlanItem } from "../domain/daily-reset/contracts";
import type { AppAInboxItem } from "../domain/inbox/contracts";
import { normalizeInboxTitle } from "../domain/inbox/contracts";
import { validatePlanDraft } from "../domain/daily-reset/validation";

export type AddInboxItemResult = { draft: DailyPlanDraft } | { error: "duplicate" | "duration_required" | "capacity_unknown" | "capacity_exceeded" | "invalid_plan" };

export function addInboxItemToPlan(draft: DailyPlanDraft, item: AppAInboxItem): AddInboxItemResult {
  if (!item.estimatedMinutes) return { error: "duration_required" };
  const sourceId = `inbox_source_${item.id}`;
  const planItemId = `inbox_plan_${item.id}`;
  const allPlanItems = [...draft.firstFocus, ...draft.laterToday, ...draft.ifCapacityRemains];
  const title = normalizeInboxTitle(item.title);
  if (draft.classifiedItems.some((entry) => entry.id === sourceId || normalizeInboxTitle(entry.suggestedAction || entry.originalText) === title)
    || allPlanItems.some((entry) => entry.id === planItemId || entry.sourceItemIds.includes(sourceId) || normalizeInboxTitle(entry.title) === title)) {
    return { error: "duplicate" };
  }
  if (draft.availableMinutes === undefined) return { error: "capacity_unknown" };
  if (draft.plannedRequiredMinutes + item.estimatedMinutes > draft.availableMinutes) return { error: "capacity_exceeded" };
  const priority = { explanation: "Added by the user from Inbox." };
  const classified: ClassifiedBrainDumpItem = {
    id: sourceId,
    originalText: item.title,
    kind: "task",
    timeHorizon: "today",
    suggestedAction: item.title,
    estimatedMinutes: item.estimatedMinutes,
    requiredEnergy: 3,
    timeSensitivity: "none",
    isAmbiguous: false,
    needsCheck: false,
    priority,
  };
  const planItem: DailyPlanItem = {
    id: planItemId,
    sourceItemIds: [sourceId],
    title: item.title,
    ...(item.details ? { description: item.details } : {}),
    block: "later_today",
    estimatedMinutes: item.estimatedMinutes,
    requiredEnergy: 3,
    timeSensitivity: "none",
    priority,
    reasoning: "Added by explicit user action from Inbox.",
    needsCheck: false,
  };
  const next: DailyPlanDraft = {
    ...draft,
    classifiedItems: [...draft.classifiedItems, classified],
    laterToday: [...draft.laterToday, planItem],
    plannedRequiredMinutes: draft.plannedRequiredMinutes + item.estimatedMinutes,
  };
  return validatePlanDraft(next).valid ? { draft: next } : { error: "invalid_plan" };
}
