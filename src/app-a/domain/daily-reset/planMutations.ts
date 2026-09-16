import {
  DailyPlanDraft,
  DailyPlanItem,
  PlanBlock,
} from "./contracts";
import { recalculatePlanTotals } from "./validation";

export interface PlanMutationResult {
  draft: DailyPlanDraft;
  error?: string;
}

/**
 * Checks if a plan item represents a waiting-for item.
 */
export function isWaitingForItem(item: DailyPlanItem, draft?: DailyPlanDraft): boolean {
  if (
    (item as any).kind === "waiting_for" ||
    Boolean((item as any).waitingFor) ||
    Boolean((item as any).isWaiting)
  ) {
    return true;
  }
  if (draft?.classifiedItems && item.sourceItemIds) {
    return draft.classifiedItems.some(
      (ci) => item.sourceItemIds.includes(ci.id) && ci.kind === "waiting_for"
    );
  }
  return false;
}

/**
 * Moves a plan item between blocks (first_focus, later_today, if_capacity_remains).
 * Canonical domain rules:
 * 1. Fixed commitments are locked (cannot be moved).
 * 2. Items with waiting-for cannot enter first_focus.
 * 3. Maximum 3 flexible items in first_focus.
 * 4. Recalculates plan totals and marks manualPriorityOverride: true.
 */
export function movePlanItemToBlock(
  draft: DailyPlanDraft,
  itemId: string,
  targetBlock: PlanBlock
): PlanMutationResult {
  let foundItem: DailyPlanItem | undefined;
  let sourceBlock: PlanBlock | undefined;

  for (const item of draft.firstFocus) {
    if (item.id === itemId) {
      foundItem = item;
      sourceBlock = "first_focus";
      break;
    }
  }
  if (!foundItem) {
    for (const item of draft.laterToday) {
      if (item.id === itemId) {
        foundItem = item;
        sourceBlock = "later_today";
        break;
      }
    }
  }
  if (!foundItem) {
    for (const item of draft.ifCapacityRemains) {
      if (item.id === itemId) {
        foundItem = item;
        sourceBlock = "if_capacity_remains";
        break;
      }
    }
  }

  if (!foundItem || !sourceBlock) {
    return { draft, error: "item_not_found" };
  }

  if (sourceBlock === targetBlock) {
    return { draft };
  }

  // Invariant 1: Fixed commitments are locked
  if (foundItem.capacityType === "fixed") {
    return { draft, error: "cannot_move_fixed_task" };
  }

  // Invariant 2 & 3: Moving into first_focus
  if (targetBlock === "first_focus") {
    // Waiting-for items cannot enter first focus
    if (isWaitingForItem(foundItem, draft)) {
      return { draft, error: "waiting_for_cannot_be_first_focus" };
    }

    // Maximum 3 flexible items in first_focus
    const currentFlexibleCount = draft.firstFocus.filter(
      (i) => i.capacityType !== "fixed" && i.id !== itemId
    ).length;
    if (currentFlexibleCount >= 3) {
      return { draft, error: "first_focus_limit_exceeded" };
    }
  }

  const firstFocus = draft.firstFocus.filter((i) => i.id !== itemId);
  const laterToday = draft.laterToday.filter((i) => i.id !== itemId);
  const ifCapacityRemains = draft.ifCapacityRemains.filter((i) => i.id !== itemId);

  const updatedItem: DailyPlanItem = {
    ...foundItem,
    block: targetBlock,
  };

  const newFirst = targetBlock === "first_focus" ? [...firstFocus, updatedItem] : firstFocus;
  const newLater = targetBlock === "later_today" ? [...laterToday, updatedItem] : laterToday;
  const newOptional = targetBlock === "if_capacity_remains" ? [...ifCapacityRemains, updatedItem] : ifCapacityRemains;

  const updatedDraft = recalculatePlanTotals({
    ...draft,
    firstFocus: newFirst,
    laterToday: newLater,
    ifCapacityRemains: newOptional,
    manualPriorityOverride: true,
  });

  return { draft: updatedDraft };
}

/**
 * Reorders a plan item within its current block.
 * Canonical domain rules:
 * 1. Fixed commitments cannot be reordered outside their scheduled position.
 * 2. Swapping with a fixed commitment is blocked.
 * 3. Marks manualPriorityOverride: true.
 */
export function reorderPlanItems(
  draft: DailyPlanDraft,
  itemId: string,
  direction: "up" | "down"
): PlanMutationResult {
  const blocks: Array<"firstFocus" | "laterToday" | "ifCapacityRemains"> = [
    "firstFocus",
    "laterToday",
    "ifCapacityRemains",
  ];

  for (const blockKey of blocks) {
    const items = draft[blockKey] || [];
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx !== -1) {
      const item = items[idx];
      if (item.capacityType === "fixed") {
        return { draft, error: "cannot_reorder_fixed_task" };
      }

      const targetIdx = direction === "up" ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= items.length) {
        return { draft };
      }

      const targetItem = items[targetIdx];
      if (targetItem.capacityType === "fixed") {
        return { draft, error: "cannot_swap_with_fixed_task" };
      }

      const nextItems = [...items];
      nextItems[idx] = targetItem;
      nextItems[targetIdx] = item;

      const updatedDraft: DailyPlanDraft = {
        ...draft,
        [blockKey]: nextItems,
        manualPriorityOverride: true,
      };

      return { draft: updatedDraft };
    }
  }

  return { draft, error: "item_not_found" };
}

/**
 * Updates the title of a plan item.
 * Canonical domain rules:
 * 1. Title cannot be empty.
 * 2. Updates the item in its block and synchronizes classifiedItems if matched.
 */
export function updatePlanItemTitle(
  draft: DailyPlanDraft,
  itemId: string,
  newTitle: string
): PlanMutationResult {
  const cleanTitle = newTitle?.trim();
  if (!cleanTitle) {
    return { draft, error: "title_cannot_be_empty" };
  }

  let foundItem: DailyPlanItem | undefined;
  const updateList = (list: DailyPlanItem[]) =>
    list.map((item) => {
      if (item.id === itemId) {
        foundItem = item;
        return { ...item, title: cleanTitle };
      }
      return item;
    });

  const nextFirst = updateList(draft.firstFocus);
  const nextLater = updateList(draft.laterToday);
  const nextOptional = updateList(draft.ifCapacityRemains);

  if (!foundItem) {
    return { draft, error: "item_not_found" };
  }

  const sourceIds = (foundItem as DailyPlanItem).sourceItemIds || [itemId];

  const nextClassified = (draft.classifiedItems || []).map((ci) => {
    if (ci.id === itemId || sourceIds.includes(ci.id)) {
      return { ...ci, originalText: cleanTitle };
    }
    return ci;
  });

  const updatedDraft: DailyPlanDraft = {
    ...draft,
    firstFocus: nextFirst,
    laterToday: nextLater,
    ifCapacityRemains: nextOptional,
    classifiedItems: nextClassified,
    manualPriorityOverride: true,
  };

  return { draft: updatedDraft };
}

/**
 * Toggles completion of an item, supporting undo.
 */
export function toggleItemCompletion(
  draft: DailyPlanDraft,
  completedItemIds: string[],
  itemId: string
): { completedItemIds: string[] } {
  if (completedItemIds.includes(itemId)) {
    return { completedItemIds: completedItemIds.filter((id) => id !== itemId) };
  }
  return { completedItemIds: [...completedItemIds, itemId] };
}
