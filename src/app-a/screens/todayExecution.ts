import type { DailyPlanDraft } from "../domain/daily-reset/contracts";

export function getTodayPlanItemIds(draft: DailyPlanDraft): string[] {
  return [
    ...draft.firstFocus,
    ...draft.laterToday,
    ...draft.ifCapacityRemains,
  ].map((item) => item.id);
}

export function normalizeCompletedItemIds(
  draft: DailyPlanDraft,
  completedItemIds: string[],
): string[] {
  const validIds = new Set(getTodayPlanItemIds(draft));
  return Array.from(new Set(completedItemIds)).filter((id) => validIds.has(id));
}

export function toggleCompletedItemId(
  draft: DailyPlanDraft,
  completedItemIds: string[],
  itemId: string,
): string[] {
  const normalized = normalizeCompletedItemIds(draft, completedItemIds);
  if (!getTodayPlanItemIds(draft).includes(itemId)) return normalized;
  return normalized.includes(itemId)
    ? normalized.filter((id) => id !== itemId)
    : [...normalized, itemId];
}
